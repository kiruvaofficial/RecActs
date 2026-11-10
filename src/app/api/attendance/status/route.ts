export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import prisma from '@/lib/prisma';
import { processAutoAttendance } from '@/lib/auto-attendance';

export async function GET(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  const url = new URL(req.url);
  const workDate = url.searchParams.get('date') || '2026-10-31';

  try {
    // Process automated shift check-in & check-out if enabled
    if (context.organization.autoCheckInOutEnabled) {
      await processAutoAttendance({
        organizationId: context.organizationId,
        workDate,
        orgSettings: context.organization,
      });
    }

    // Current user's sessions for the day
    const mySessions = await prisma.attendanceSession.findMany({
      where: {
        membershipId: context.membershipId,
        workDate,
      },
      include: {
        breaks: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const activeSession = mySessions.find((s) => !s.checkOutTime);
    const totalMinutes = mySessions.reduce((acc, s) => acc + s.totalMinutes, 0);

    // Team members attendance (all members for leads/managers/hr/owner, or same-team colleagues for members)
    let teamAttendance: any[] = [];
    const teamFilter: any = { organizationId: context.organizationId };
    if (context.role === 'member' && context.membership?.teamId) {
      teamFilter.teamId = context.membership.teamId;
    }

    const allMembers = await prisma.organizationMembership.findMany({
      where: teamFilter,
      include: {
        user: true,
        team: true,
        attendanceSessions: {
          where: { workDate },
        },
        leaveRequests: {
          where: {
            status: 'Approved',
            startDate: { lte: workDate },
            endDate: { gte: workDate },
          },
          include: { leaveType: true },
        },
      },
      orderBy: { user: { name: 'asc' } },
    });

    teamAttendance = allMembers.map((m) => {
      const session = m.attendanceSessions[0];
      const onLeave = m.leaveRequests.length > 0;
      let st = 'Not checked in';
      if (onLeave) st = 'On leave';
      else if (session) st = session.status;

      return {
        id: m.id,
        name: m.user.name,
        initials: m.user.initials,
        designation: m.designation,
        team: m.team?.name || '—',
        status: st,
        checkIn: session?.checkInTime || '—',
        checkOut: session?.checkOutTime || '—',
        totalMinutes: session?.totalMinutes || 0,
        leaveType: onLeave ? m.leaveRequests[0].leaveType.code : null,
      };
    });

    return NextResponse.json({
      workDate,
      isCheckedIn: !!activeSession,
      activeSession,
      sessions: mySessions,
      totalMinutes,
      teamAttendance,
      policy: {
        attendanceTrackingEnabled: context.organization.attendanceTrackingEnabled,
        attendanceMandatory: context.organization.attendanceMandatory,
        autoCheckInOutEnabled: context.organization.autoCheckInOutEnabled,
        autoCheckInOutExcludeLeaves: context.organization.autoCheckInOutExcludeLeaves,
      },
    });
  } catch (err) {
    console.error('Error fetching attendance status:', err);
    return NextResponse.json({ error: 'Failed to fetch attendance status' }, { status: 500 });
  }
}
