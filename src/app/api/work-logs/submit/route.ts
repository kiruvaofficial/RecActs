import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import prisma from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  try {
    const body = await req.json();
    const { workDate } = body;

    const workLog = await prisma.workLog.findUnique({
      where: {
        membershipId_workDate: {
          membershipId: context.membershipId,
          workDate: workDate || '2026-11-09',
        },
      },
      include: { activities: true },
    });

    if (!workLog || workLog.activities.length === 0) {
      return NextResponse.json(
        { error: 'Cannot submit an empty work log. Please add at least one activity.' },
        { status: 400 }
      );
    }

    if (workLog.submissionStatus === 'Approved') {
      return NextResponse.json({ error: 'This work log has already been approved.' }, { status: 400 });
    }

    const updated = await prisma.workLog.update({
      where: { id: workLog.id },
      data: {
        submissionStatus: 'Submitted',
        submittedAt: new Date(),
      },
    });

    // Record approval event
    await prisma.workLogApprovalEvent.create({
      data: {
        workLogId: workLog.id,
        actorName: context.user.name,
        action: 'Submitted',
        comments: 'Daily work log submitted for approval',
      },
    });

    // Notify Reporting Lead
    if (context.membership?.reportingLeadId) {
      await prisma.notification.create({
        data: {
          organizationId: context.organizationId,
          recipientMembershipId: context.membership.reportingLeadId,
          title: 'Work log submitted',
          body: `${context.user.name} submitted their work log for ${workLog.workDate}.`,
          targetModule: 'approvals',
          targetEntityId: workLog.id,
        },
      });
    }

    await logAuditEvent({
      organizationId: context.organizationId,
      actorMembershipId: context.membershipId,
      actorName: context.user.name,
      module: 'Work Logs',
      action: `Submitted work log for ${workLog.workDate} (${workLog.activities.length} activities)`,
    });

    return NextResponse.json({ success: true, workLog: updated });
  } catch (err) {
    console.error('Error submitting work log:', err);
    return NextResponse.json({ error: 'Failed to submit work log' }, { status: 500 });
  }
}
