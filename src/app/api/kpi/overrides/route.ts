import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import prisma from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  try {
    const overrides = await prisma.targetOverride.findMany({
      where: { organizationId: context.organizationId },
      include: {
        membership: { include: { user: true, team: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = overrides.map((o) => ({
      id: o.id,
      memberId: o.membershipId,
      memberName: o.membership.user.name,
      teamName: o.membership.team?.name || 'Alpha',
      period: o.period,
      calculatedTarget: `${o.calculatedTargetHours}h`,
      revisedTarget: o.revisedTargetHours,
      reason: o.reason,
      status: o.status,
    }));

    return NextResponse.json({ overrides: formatted });
  } catch (err) {
    console.error('Error fetching target overrides:', err);
    return NextResponse.json({ error: 'Failed to fetch target overrides' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  if (!['lead', 'manager', 'owner'].includes(context.role)) {
    return NextResponse.json({ error: 'Unauthorized to propose target overrides' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { memberId, period, calculatedTargetHours, revisedTargetHours, reason } = body;

    if (!memberId || !revisedTargetHours || !reason) {
      return NextResponse.json(
        { error: 'memberId, revisedTargetHours, and mandatory reason required' },
        { status: 400 }
      );
    }

    const member = await prisma.organizationMembership.findUnique({
      where: { id: memberId },
      include: { user: true },
    });

    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    // If Manager or Owner submits, it can be auto-approved; if Lead submits, it is Pending
    const isAutoApproved = ['manager', 'owner'].includes(context.role);

    const override = await prisma.targetOverride.create({
      data: {
        organizationId: context.organizationId,
        membershipId: memberId,
        period: period || 'Nov 2026',
        calculatedTargetHours: Number(calculatedTargetHours || 144),
        revisedTargetHours: Number(revisedTargetHours),
        reason,
        status: isAutoApproved ? 'Approved' : 'Pending',
        submittedByMembershipId: context.membershipId,
        reviewedByMembershipId: isAutoApproved ? context.membershipId : null,
        reviewedAt: isAutoApproved ? new Date() : null,
      },
    });

    await logAuditEvent({
      organizationId: context.organizationId,
      actorMembershipId: context.membershipId,
      actorName: context.user.name,
      module: 'KPI',
      action: `Proposed target override for ${member.user.name}: ${calculatedTargetHours}h → ${revisedTargetHours}h`,
      details: reason,
    });

    return NextResponse.json({ success: true, override });
  } catch (err) {
    console.error('Error creating target override:', err);
    return NextResponse.json({ error: 'Failed to create target override' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  if (!['manager', 'owner'].includes(context.role)) {
    return NextResponse.json({ error: 'Only Managers and Owners can approve target overrides' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { overrideId, action } = body; // action: 'approve' | 'reject'

    const updated = await prisma.targetOverride.update({
      where: { id: overrideId },
      data: {
        status: action === 'approve' ? 'Approved' : 'Rejected',
        reviewedByMembershipId: context.membershipId,
        reviewedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, override: updated });
  } catch (err) {
    console.error('Error approving override:', err);
    return NextResponse.json({ error: 'Failed to approve override' }, { status: 500 });
  }
}
