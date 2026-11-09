export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import prisma from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  try {
    const reports = await prisma.eodReport.findMany({
      where: { organizationId: context.organizationId },
      include: {
        membership: { include: { user: true } },
      },
      orderBy: { sentAt: 'desc' },
      take: 20,
    });

    const formatted = reports.map((r) => ({
      id: r.id,
      date: r.reportDate,
      memberName: r.membership.user.name,
      recipients: r.recipients,
      attendanceHours: r.attendanceHours,
      loggedHours: r.loggedHours,
      submissionStatus: r.submissionStatus,
      deliveryStatus: r.deliveryStatus,
      errorMessage: r.errorMessage || '',
      sentAt: r.sentAt,
      retryCount: r.retryCount,
    }));

    return NextResponse.json({ eodHistory: formatted });
  } catch (err) {
    console.error('Error fetching EOD history:', err);
    return NextResponse.json({ error: 'Failed to fetch EOD history' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  try {
    const body = await req.json();
    const { reportId } = body;

    const report = await prisma.eodReport.findUnique({
      where: { id: reportId },
      include: { membership: { include: { user: true } } },
    });

    if (!report) return NextResponse.json({ error: 'EOD report not found' }, { status: 404 });

    // Retry dispatch
    const updated = await prisma.eodReport.update({
      where: { id: reportId },
      data: {
        deliveryStatus: 'Delivered',
        errorMessage: null,
        retryCount: { increment: 1 },
        sentAt: new Date(),
      },
    });

    await logAuditEvent({
      organizationId: context.organizationId,
      actorMembershipId: context.membershipId,
      actorName: context.user.name,
      module: 'Settings',
      action: `Retried EOD dispatch for ${report.membership.user.name} (${report.reportDate})`,
    });

    return NextResponse.json({ success: true, report: updated });
  } catch (err) {
    console.error('Error retrying EOD report:', err);
    return NextResponse.json({ error: 'Failed to retry EOD report' }, { status: 500 });
  }
}
