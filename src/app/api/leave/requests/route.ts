export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import prisma from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  try {
    // 1. Fetch Leave Types
    const leaveTypes = await prisma.leaveType.findMany({
      where: { organizationId: context.organizationId },
    });

    // 2. Fetch User's Balances
    const balances = await prisma.leaveBalance.findMany({
      where: { membershipId: context.membershipId },
      include: { leaveType: true },
    });

    // 3. Fetch User's Leave Requests
    const myRequests = await prisma.leaveRequest.findMany({
      where: { membershipId: context.membershipId },
      include: { leaveType: true },
      orderBy: { createdAt: 'desc' },
    });

    // 4. Fetch Team Leave Requests (for Approvers / HR / Calendar)
    const teamRequests = await prisma.leaveRequest.findMany({
      where: { organizationId: context.organizationId },
      include: {
        membership: { include: { user: true, team: true } },
        leaveType: true,
      },
      orderBy: { startDate: 'asc' },
    });

    // 5. Fetch Public Holidays
    const holidays = await prisma.holiday.findMany({
      where: { organizationId: context.organizationId },
      orderBy: { holidayDate: 'asc' },
    });

    return NextResponse.json({
      leaveTypes,
      balances,
      myRequests,
      teamRequests: teamRequests.map((tr) => ({
        id: tr.id,
        memberId: tr.membershipId,
        memberName: tr.membership.user.name,
        memberInitials: tr.membership.user.initials,
        teamName: tr.membership.team?.name || '—',
        typeCode: tr.leaveType.code,
        typeName: tr.leaveType.name,
        typeColor: tr.leaveType.colorHex,
        startDate: tr.startDate,
        endDate: tr.endDate,
        totalDays: tr.totalDays,
        isHalfDay: tr.isHalfDay,
        reason: tr.reason,
        status: tr.status,
      })),
      holidays,
    });
  } catch (err) {
    console.error('Error fetching leave data:', err);
    return NextResponse.json({ error: 'Failed to fetch leave data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  try {
    const body = await req.json();
    const { typeCode, startDate, endDate, isHalfDay, totalDays, reason } = body;

    if (!typeCode || !startDate || !endDate || !reason) {
      return NextResponse.json({ error: 'typeCode, startDate, endDate, and reason required' }, { status: 400 });
    }

    const leaveType = await prisma.leaveType.findFirst({
      where: { organizationId: context.organizationId, code: typeCode },
    });

    if (!leaveType) {
      return NextResponse.json({ error: 'Invalid leave type' }, { status: 400 });
    }

    const calculatedDays = isHalfDay ? 0.5 : Number(totalDays || 1);

    // Check balance if not unlimited
    if (!leaveType.isUnlimited) {
      const balance = await prisma.leaveBalance.findUnique({
        where: {
          membershipId_leaveTypeId_year: {
            membershipId: context.membershipId,
            leaveTypeId: leaveType.id,
            year: 2026,
          },
        },
      });

      if (balance) {
        const remaining = balance.allocatedDays - balance.usedDays;
        if (remaining < calculatedDays) {
          return NextResponse.json(
            { error: `Insufficient leave balance. You have ${remaining} day(s) remaining for ${leaveType.name}.` },
            { status: 400 }
          );
        }
      }
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        organizationId: context.organizationId,
        membershipId: context.membershipId,
        leaveTypeId: leaveType.id,
        startDate,
        endDate,
        isHalfDay: !!isHalfDay,
        totalDays: calculatedDays,
        reason,
        status: 'Pending',
      },
    });

    // Notify Reporting Lead
    if (context.membership?.reportingLeadId) {
      await prisma.notification.create({
        data: {
          organizationId: context.organizationId,
          recipientMembershipId: context.membership.reportingLeadId,
          title: `Leave request: ${context.user.name}`,
          body: `${context.user.name} requested ${calculatedDays} day(s) of ${leaveType.code} (${startDate} to ${endDate}).`,
          targetModule: 'leave',
          targetEntityId: leaveRequest.id,
        },
      });
    }

    await logAuditEvent({
      organizationId: context.organizationId,
      actorMembershipId: context.membershipId,
      actorName: context.user.name,
      module: 'Leave',
      action: `Applied for ${calculatedDays} day(s) of ${leaveType.code} (${startDate} to ${endDate})`,
    });

    return NextResponse.json({ success: true, leaveRequest });
  } catch (err) {
    console.error('Error submitting leave request:', err);
    return NextResponse.json({ error: 'Failed to submit leave request' }, { status: 500 });
  }
}
