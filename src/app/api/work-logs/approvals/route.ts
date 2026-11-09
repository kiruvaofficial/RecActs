import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import prisma from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  if (!['lead', 'manager', 'owner'].includes(context.role)) {
    return NextResponse.json({ error: 'Unauthorized to view approvals' }, { status: 403 });
  }

  try {
    // Lead views direct reports; Manager and Owner view all
    const whereClause: any = {
      organizationId: context.organizationId,
    };

    if (context.role === 'lead') {
      whereClause.membership = {
        reportingLeadId: context.membershipId,
      };
    }

    const workLogs = await prisma.workLog.findMany({
      where: whereClause,
      include: {
        membership: {
          include: {
            user: true,
            team: true,
            attendanceSessions: true,
          },
        },
        activities: {
          include: {
            ticket: true,
          },
        },
        approvalEvents: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { workDate: 'desc' },
    });

    const formatted = workLogs.map((wl) => {
      const attSession = wl.membership.attendanceSessions.find((s) => s.workDate === wl.workDate);
      const attMinutes = attSession ? attSession.totalMinutes : 0;
      const loggedMinutes = wl.activities.reduce((acc, a) => acc + a.durationMinutes, 0);

      return {
        id: wl.id,
        memberId: wl.membership.id,
        memberName: wl.membership.user.name,
        memberInitials: wl.membership.user.initials,
        teamName: wl.membership.team?.name || 'Alpha',
        workDate: wl.workDate,
        submissionStatus: wl.submissionStatus,
        submittedAt: wl.submittedAt,
        attendanceMinutes: attMinutes,
        loggedMinutes,
        reviewComments: wl.reviewComments,
        activities: wl.activities.map((a) => ({
          id: a.id,
          ticketRef: a.ticket?.reference || 'General',
          ticketTitle: a.ticket?.title || '',
          activityType: a.activityType,
          description: a.description,
          durationMinutes: a.durationMinutes,
          startTime: a.startTime,
          endTime: a.endTime,
          progressStatus: a.progressStatus,
          blockerFlag: a.blockerFlag,
        })),
        events: wl.approvalEvents,
      };
    });

    return NextResponse.json({ approvals: formatted });
  } catch (err) {
    console.error('Error fetching approval queue:', err);
    return NextResponse.json({ error: 'Failed to fetch approval queue' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  if (!['lead', 'manager', 'owner'].includes(context.role)) {
    return NextResponse.json({ error: 'Unauthorized to approve work logs' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { workLogId, action, comments } = body; // action: 'approve' | 'return'

    if (!workLogId || !action) {
      return NextResponse.json({ error: 'workLogId and action required' }, { status: 400 });
    }

    const workLog = await prisma.workLog.findUnique({
      where: { id: workLogId },
      include: {
        membership: { include: { user: true } },
        activities: true,
      },
    });

    if (!workLog) {
      return NextResponse.json({ error: 'Work log not found' }, { status: 404 });
    }

    // Rule: Cannot approve own work log unless explicit exceptional override
    if (workLog.membershipId === context.membershipId && context.role !== 'owner') {
      return NextResponse.json(
        { error: 'Employees cannot approve their own work logs under organizational policy.' },
        { status: 403 }
      );
    }

    const newStatus = action === 'approve' ? 'Approved' : 'Returned';

    const updated = await prisma.workLog.update({
      where: { id: workLogId },
      data: {
        submissionStatus: newStatus,
        reviewedByMembershipId: context.membershipId,
        reviewedAt: new Date(),
        reviewComments: comments || null,
      },
    });

    // Record approval event
    await prisma.workLogApprovalEvent.create({
      data: {
        workLogId,
        actorName: context.user.name,
        action: action === 'approve' ? 'Approved' : 'Returned',
        comments: comments || (action === 'approve' ? 'Approved by Team Lead' : 'Returned for clarification'),
      },
    });

    // If approved, update ticket loggedHours
    if (action === 'approve') {
      for (const act of workLog.activities) {
        if (act.ticketId) {
          const loggedHoursIncrement = act.durationMinutes / 60;
          await prisma.ticketAssignment.updateMany({
            where: {
              ticketId: act.ticketId,
              membershipId: workLog.membershipId,
            },
            data: {
              loggedHours: { increment: loggedHoursIncrement },
            },
          });
        }
      }
    }

    // Send notification to employee
    await prisma.notification.create({
      data: {
        organizationId: context.organizationId,
        recipientMembershipId: workLog.membershipId,
        title: action === 'approve' ? 'Work log approved' : 'Work log returned for correction',
        body: `${context.user.name} ${action === 'approve' ? 'approved' : 'returned'} your log for ${workLog.workDate}.${comments ? ` Note: "${comments}"` : ''}`,
        targetModule: 'activities',
        targetEntityId: workLogId,
      },
    });

    await logAuditEvent({
      organizationId: context.organizationId,
      actorMembershipId: context.membershipId,
      actorName: context.user.name,
      module: 'Approvals',
      action: `${action === 'approve' ? 'Approved' : 'Returned'} work log of ${workLog.membership.user.name} for ${workLog.workDate}`,
      details: comments || undefined,
    });

    return NextResponse.json({ success: true, workLog: updated });
  } catch (err) {
    console.error('Error in approval action:', err);
    return NextResponse.json({ error: 'Failed to record approval decision' }, { status: 500 });
  }
}
