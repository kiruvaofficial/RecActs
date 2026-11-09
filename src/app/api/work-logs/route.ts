export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  const url = new URL(req.url);
  const workDate = url.searchParams.get('date') || '2026-10-31';
  const targetMemberId = url.searchParams.get('memberId') || context.membershipId;

  try {
    const workLog = await prisma.workLog.findUnique({
      where: {
        membershipId_workDate: {
          membershipId: targetMemberId,
          workDate,
        },
      },
      include: {
        activities: {
          include: {
            ticket: true,
          },
        },
        approvalEvents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Also fetch historical work logs for the user
    const history = await prisma.workLog.findMany({
      where: { membershipId: targetMemberId },
      include: {
        activities: true,
      },
      orderBy: { workDate: 'desc' },
      take: 10,
    });

    const formattedHistory = history.map((h) => {
      const totalMinutes = h.activities.reduce((acc, a) => acc + a.durationMinutes, 0);
      return {
        id: h.id,
        workDate: h.workDate,
        submissionStatus: h.submissionStatus,
        totalMinutes,
        hoursFormatted: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`,
        comments: h.reviewComments || '',
      };
    });

    return NextResponse.json({
      workDate,
      workLog: workLog || {
        submissionStatus: 'Draft',
        activities: [],
        reviewComments: '',
      },
      history: formattedHistory,
    });
  } catch (err) {
    console.error('Error fetching work log:', err);
    return NextResponse.json({ error: 'Failed to fetch work log' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  try {
    const body = await req.json();
    const { workDate, activities } = body;

    if (!workDate || !Array.isArray(activities)) {
      return NextResponse.json({ error: 'Invalid payload: workDate and activities required' }, { status: 400 });
    }

    // Check if log is already approved (cannot edit approved log without adjustment workflow)
    const existing = await prisma.workLog.findUnique({
      where: {
        membershipId_workDate: {
          membershipId: context.membershipId,
          workDate,
        },
      },
    });

    if (existing && existing.submissionStatus === 'Approved') {
      return NextResponse.json(
        { error: 'Cannot modify an approved work log. Contact your Manager for a correction workflow.' },
        { status: 403 }
      );
    }

    // Upsert WorkLog header
    const workLog = await prisma.workLog.upsert({
      where: {
        membershipId_workDate: {
          membershipId: context.membershipId,
          workDate,
        },
      },
      update: {
        submissionStatus: existing?.submissionStatus === 'Returned' ? 'Returned' : 'Draft',
      },
      create: {
        organizationId: context.organizationId,
        membershipId: context.membershipId,
        workDate,
        submissionStatus: 'Draft',
      },
    });

    // Delete existing activities and recreate updated set
    await prisma.workLogActivity.deleteMany({
      where: { workLogId: workLog.id },
    });

    for (const act of activities) {
      // Find ticket if reference provided
      let ticketId = act.ticketId;
      if (!ticketId && act.ticketRef) {
        const t = await prisma.ticket.findFirst({
          where: { organizationId: context.organizationId, reference: act.ticketRef },
        });
        if (t) ticketId = t.id;
      }

      const durationMinutes = Math.max(1, Number(act.durationMinutes || 0));

      await prisma.workLogActivity.create({
        data: {
          workLogId: workLog.id,
          ticketId: ticketId || null,
          activityType: act.activityType || 'Requirement Analysis',
          description: act.description || '',
          startTime: act.startTime || null,
          endTime: act.endTime || null,
          durationMinutes,
          progressStatus: act.progressStatus || 'In Progress',
          blockerFlag: !!act.blockerFlag,
          blockerId: act.blockerId || null,
        },
      });
    }

    return NextResponse.json({ success: true, workLogId: workLog.id });
  } catch (err) {
    console.error('Error saving draft work log:', err);
    return NextResponse.json({ error: 'Failed to save work log' }, { status: 500 });
  }
}
