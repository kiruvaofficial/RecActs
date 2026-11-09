import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import prisma from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  if (!['lead', 'manager', 'hr', 'owner'].includes(context.role)) {
    return NextResponse.json({ error: 'Unauthorized to approve leave requests' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { requestId, action, comments } = body; // action: 'approve' | 'reject'

    if (!requestId || !action) {
      return NextResponse.json({ error: 'requestId and action required' }, { status: 400 });
    }

    const leaveReq = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: {
        membership: { include: { user: true } },
        leaveType: true,
      },
    });

    if (!leaveReq) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    const newStatus = action === 'approve' ? 'Approved' : 'Rejected';

    const updated = await prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        reviewedByMembershipId: context.membershipId,
        reviewedAt: new Date(),
        reviewComments: comments || null,
      },
    });

    // If approved, update LeaveBalance
    if (action === 'approve') {
      await prisma.leaveBalance.updateMany({
        where: {
          membershipId: leaveReq.membershipId,
          leaveTypeId: leaveReq.leaveTypeId,
          year: 2026,
        },
        data: {
          usedDays: { increment: leaveReq.totalDays },
        },
      });
    }

    // Send notification to employee
    await prisma.notification.create({
      data: {
        organizationId: context.organizationId,
        recipientMembershipId: leaveReq.membershipId,
        title: `Leave request ${newStatus.toLowerCase()}`,
        body: `${context.user.name} has ${newStatus.toLowerCase()} your ${leaveReq.leaveType.code} request for ${leaveReq.startDate}.${comments ? ` Note: "${comments}"` : ''}`,
        targetModule: 'leave',
        targetEntityId: requestId,
      },
    });

    await logAuditEvent({
      organizationId: context.organizationId,
      actorMembershipId: context.membershipId,
      actorName: context.user.name,
      module: 'Leave',
      action: `${newStatus} ${leaveReq.totalDays} day(s) of ${leaveReq.leaveType.code} for ${leaveReq.membership.user.name}`,
      details: comments || undefined,
    });

    return NextResponse.json({ success: true, leaveRequest: updated });
  } catch (err) {
    console.error('Error approving leave:', err);
    return NextResponse.json({ error: 'Failed to process leave decision' }, { status: 500 });
  }
}
