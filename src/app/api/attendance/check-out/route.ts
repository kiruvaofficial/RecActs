export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import prisma from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { invalidateBootstrapCache } from '@/lib/bootstrap';

export async function POST(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  const now = new Date();
  const workDate = now.toISOString().split('T')[0];
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  try {
    const active = await prisma.attendanceSession.findFirst({
      where: {
        membershipId: context.membershipId,
        checkOutTime: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!active) {
      return NextResponse.json({ error: 'No active session found to check out' }, { status: 400 });
    }

    // Calculate duration in minutes
    const [inH, inM] = active.checkInTime.split(':').map(Number);
    const [outH, outM] = timeStr.split(':').map(Number);
    let duration = (outH * 60 + outM) - (inH * 60 + inM);
    if (duration < 0) duration += 24 * 60; // cross-midnight

    const updated = await prisma.attendanceSession.update({
      where: { id: active.id },
      data: {
        checkOutTime: timeStr,
        totalMinutes: duration,
      },
    });

    await logAuditEvent({
      organizationId: context.organizationId,
      actorMembershipId: context.membershipId,
      actorName: context.user.name,
      module: 'Attendance',
      action: `Checked out at ${timeStr} (Total: ${Math.floor(duration / 60)}h ${duration % 60}m)`,
    });

    invalidateBootstrapCache(context.organizationId);
    return NextResponse.json({ success: true, session: updated });
  } catch (err) {
    console.error('Error in check-out:', err);
    return NextResponse.json({ error: 'Failed to record check-out' }, { status: 500 });
  }
}
