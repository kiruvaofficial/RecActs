export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  const url = new URL(req.url);
  const reportType = url.searchParams.get('type') || 'Individual KPI';
  const period = url.searchParams.get('period') || 'Monthly';
  const teamFilter = url.searchParams.get('team') || 'All';

  try {
    // 1. Attendance overview stats
    const attendanceCount = await prisma.attendanceSession.count({
      where: { workDate: '2026-11-09' },
    });

    // 2. Ticket weightages summary
    const tickets = await prisma.ticket.findMany({
      where: { organizationId: context.organizationId },
      include: {
        team: true,
        assignments: { include: { membership: { include: { user: true } } } },
      },
    });

    const ticketSummary = tickets.map((t) => ({
      ref: t.reference,
      title: t.title,
      customer: t.customerName,
      priority: t.priority,
      status: t.status,
      weightage: t.totalEstimatedHours,
      team: t.team?.name || 'Alpha',
      assignees: t.assignments.map((a) => `${a.membership.user.name} (${a.allocatedHours}h)`).join(', '),
      loggedHours: t.assignments.reduce((acc, a) => acc + a.loggedHours, 0),
    }));

    return NextResponse.json({
      reportType,
      period,
      teamFilter,
      attendanceCount,
      tickets: ticketSummary,
    });
  } catch (err) {
    console.error('Error fetching reports data:', err);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}
