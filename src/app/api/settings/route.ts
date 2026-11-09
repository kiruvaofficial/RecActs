export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import prisma from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function GET() {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  try {
    const org = await prisma.organization.findUnique({
      where: { id: context.organizationId },
      include: {
        holidays: { orderBy: { holidayDate: 'asc' } },
        leaveTypes: true,
      },
    });

    return NextResponse.json({ organization: org });
  } catch (err) {
    console.error('Error fetching settings:', err);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  if (!['owner', 'hr'].includes(context.role)) {
    return NextResponse.json({ error: 'Only Organization Owners and HR can update settings' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      productivityFactor,
      workHoursStart,
      workHoursEnd,
      gracePeriodMinutes,
      workDays,
      timezone,
    } = body;

    const updated = await prisma.organization.update({
      where: { id: context.organizationId },
      data: {
        productivityFactor: productivityFactor !== undefined ? Number(productivityFactor) : undefined,
        workHoursStart: workHoursStart || undefined,
        workHoursEnd: workHoursEnd || undefined,
        gracePeriodMinutes: gracePeriodMinutes !== undefined ? Number(gracePeriodMinutes) : undefined,
        workDays: workDays || undefined,
        timezone: timezone || undefined,
      },
    });

    await logAuditEvent({
      organizationId: context.organizationId,
      actorMembershipId: context.membershipId,
      actorName: context.user.name,
      module: 'Settings',
      action: `Updated organization settings (Productivity: ${updated.productivityFactor}%, Shift: ${updated.workHoursStart}-${updated.workHoursEnd})`,
    });

    return NextResponse.json({ success: true, organization: updated });
  } catch (err) {
    console.error('Error updating settings:', err);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
