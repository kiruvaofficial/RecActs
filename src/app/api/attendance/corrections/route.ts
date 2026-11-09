import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import prisma from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  try {
    const corrections = await prisma.attendanceCorrection.findMany({
      where: {
        membership: {
          organizationId: context.organizationId,
        },
      },
      include: {
        membership: { include: { user: true, team: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = corrections.map((c) => ({
      id: c.id,
      memberName: c.membership.user.name,
      teamName: c.membership.team?.name || 'Alpha',
      workDate: c.workDate,
      correctionType: c.correctionType,
      requestedTime: c.requestedTime,
      reason: c.reason,
      status: c.status,
      createdAt: c.createdAt,
    }));

    return NextResponse.json({ corrections: formatted });
  } catch (err) {
    console.error('Error fetching corrections:', err);
    return NextResponse.json({ error: 'Failed to fetch corrections' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  try {
    const body = await req.json();
    const { workDate, correctionType, requestedTime, reason } = body;

    if (!workDate || !correctionType || !reason) {
      return NextResponse.json({ error: 'workDate, correctionType, and reason required' }, { status: 400 });
    }

    const correction = await prisma.attendanceCorrection.create({
      data: {
        membershipId: context.membershipId,
        workDate,
        correctionType,
        requestedTime: requestedTime || 'Check-out 18:00',
        reason,
        status: 'Pending',
      },
    });

    await logAuditEvent({
      organizationId: context.organizationId,
      actorMembershipId: context.membershipId,
      actorName: context.user.name,
      module: 'Attendance',
      action: `Requested attendance correction for ${workDate}: ${correctionType} (${requestedTime})`,
      details: reason,
    });

    return NextResponse.json({ success: true, correction });
  } catch (err) {
    console.error('Error requesting correction:', err);
    return NextResponse.json({ error: 'Failed to submit correction request' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  if (!['hr', 'owner', 'manager'].includes(context.role)) {
    return NextResponse.json({ error: 'Unauthorized to approve attendance corrections' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { correctionId, action } = body; // action: 'approve' | 'reject'

    const correction = await prisma.attendanceCorrection.findUnique({
      where: { id: correctionId },
      include: { membership: { include: { user: true } } },
    });

    if (!correction) return NextResponse.json({ error: 'Correction not found' }, { status: 404 });

    const newStatus = action === 'approve' ? 'Approved' : 'Rejected';

    const updated = await prisma.attendanceCorrection.update({
      where: { id: correctionId },
      data: {
        status: newStatus,
        reviewedByMembershipId: context.membershipId,
        reviewedAt: new Date(),
      },
    });

    // If approved, update AttendanceSession
    if (action === 'approve') {
      const session = await prisma.attendanceSession.findFirst({
        where: {
          membershipId: correction.membershipId,
          workDate: correction.workDate,
        },
      });

      if (session) {
        // e.g. "Check-out 18:40"
        const timeMatch = correction.requestedTime.match(/\d{2}:\d{2}/);
        const checkOutTime = timeMatch ? timeMatch[0] : '18:30';

        const [inH, inM] = session.checkInTime.split(':').map(Number);
        const [outH, outM] = checkOutTime.split(':').map(Number);
        const duration = (outH * 60 + outM) - (inH * 60 + inM);

        await prisma.attendanceSession.update({
          where: { id: session.id },
          data: {
            checkOutTime,
            totalMinutes: Math.max(0, duration),
            status: 'Present',
            isManual: true,
          },
        });
      }
    }

    await logAuditEvent({
      organizationId: context.organizationId,
      actorMembershipId: context.membershipId,
      actorName: context.user.name,
      module: 'Attendance',
      action: `${newStatus} attendance correction for ${correction.membership.user.name} (${correction.workDate})`,
    });

    return NextResponse.json({ success: true, correction: updated });
  } catch (err) {
    console.error('Error approving correction:', err);
    return NextResponse.json({ error: 'Failed to process correction' }, { status: 500 });
  }
}
