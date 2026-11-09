export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import prisma from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  const now = new Date();
  const workDate = now.toISOString().split('T')[0];
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  try {
    // Check if there is already an active session without checkout
    const active = await prisma.attendanceSession.findFirst({
      where: {
        membershipId: context.membershipId,
        workDate,
        checkOutTime: null,
      },
    });

    if (active) {
      return NextResponse.json({ error: 'You already have an active check-in session' }, { status: 400 });
    }

    // Determine status: Late if after 09:15 (09:00 + 15m grace)
    const [h, m] = timeStr.split(':').map(Number);
    const minuteOfDay = h * 60 + m;
    const isLate = minuteOfDay > 9 * 60 + 15;
    const status = isLate ? 'Late' : 'Present';

    const session = await prisma.attendanceSession.create({
      data: {
        membershipId: context.membershipId,
        workDate,
        checkInTime: timeStr,
        status,
      },
    });

    await logAuditEvent({
      organizationId: context.organizationId,
      actorMembershipId: context.membershipId,
      actorName: context.user.name,
      module: 'Attendance',
      action: `Checked in at ${timeStr} (${status})`,
    });

    return NextResponse.json({ success: true, session });
  } catch (err) {
    console.error('Error in check-in:', err);
    return NextResponse.json({ error: 'Failed to record check-in' }, { status: 500 });
  }
}
