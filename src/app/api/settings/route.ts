export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import prisma from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { invalidateBootstrapCache } from '@/lib/bootstrap';

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
      attendanceTrackingEnabled,
      attendanceMandatory,
      autoCheckInOutEnabled,
      autoCheckInOutExcludeLeaves,
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
        attendanceTrackingEnabled: attendanceTrackingEnabled !== undefined ? Boolean(attendanceTrackingEnabled) : undefined,
        attendanceMandatory: attendanceMandatory !== undefined ? Boolean(attendanceMandatory) : undefined,
        autoCheckInOutEnabled: autoCheckInOutEnabled !== undefined ? Boolean(autoCheckInOutEnabled) : undefined,
        autoCheckInOutExcludeLeaves: autoCheckInOutExcludeLeaves !== undefined ? Boolean(autoCheckInOutExcludeLeaves) : undefined,
      },
    });

    invalidateBootstrapCache(context.organizationId);

    await logAuditEvent({
      organizationId: context.organizationId,
      actorMembershipId: context.membershipId,
      actorName: context.user.name,
      module: 'Settings',
      action: `Updated organization settings (Attendance Tracking: ${updated.attendanceTrackingEnabled ? (updated.attendanceMandatory ? 'Mandatory' : 'Optional') : 'Disabled'}, Auto Check-in/out: ${updated.autoCheckInOutEnabled ? 'Enabled' : 'Disabled'}, Exclude Leaves: ${updated.autoCheckInOutExcludeLeaves})`,
    });

    return NextResponse.json({ success: true, organization: updated });
  } catch (err) {
    console.error('Error updating settings:', err);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
