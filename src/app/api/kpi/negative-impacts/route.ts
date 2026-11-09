import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import prisma from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  try {
    const impacts = await prisma.employeeNegativeImpact.findMany({
      where: { organizationId: context.organizationId },
      include: {
        membership: { include: { user: true } },
        ticket: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = impacts.map((i) => ({
      id: i.id,
      category: i.category,
      memberName: i.membership.user.name,
      ticketRef: i.ticket?.reference || 'General',
      type: i.valueType,
      value: i.impactValue,
      reason: i.reason,
      effectiveDate: i.effectiveDate,
      status: i.status,
      basisRule: i.basisRule,
    }));

    return NextResponse.json({ negativeImpacts: formatted });
  } catch (err) {
    console.error('Error fetching negative impacts:', err);
    return NextResponse.json({ error: 'Failed to fetch negative impacts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  if (!['lead', 'manager', 'owner'].includes(context.role)) {
    return NextResponse.json({ error: 'Unauthorized to apply negative impacts' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { memberId, ticketRef, category, impactValue, valueType, reason, effectiveDate } = body;

    if (!memberId || !category || impactValue === undefined || !reason) {
      return NextResponse.json(
        { error: 'memberId, category, impactValue, and reason required' },
        { status: 400 }
      );
    }

    let ticketId: string | null = null;
    if (ticketRef) {
      const t = await prisma.ticket.findFirst({
        where: { organizationId: context.organizationId, reference: ticketRef },
      });
      if (t) ticketId = t.id;
    }

    const impact = await prisma.employeeNegativeImpact.create({
      data: {
        organizationId: context.organizationId,
        membershipId: memberId,
        ticketId,
        category,
        impactValue: Number(impactValue),
        valueType: valueType || 'percentage',
        basisRule: `Rule: ${category} deduction`,
        reason,
        effectiveDate: effectiveDate || '2026-11-09',
        appliedByMembershipId: context.membershipId,
        status: 'Approved',
      },
    });

    await logAuditEvent({
      organizationId: context.organizationId,
      actorMembershipId: context.membershipId,
      actorName: context.user.name,
      module: 'KPI',
      action: `Applied ${category} deduction (${impactValue}${valueType === 'percentage' ? '%' : 'h'})`,
      details: reason,
    });

    return NextResponse.json({ success: true, impact });
  } catch (err) {
    console.error('Error applying negative impact:', err);
    return NextResponse.json({ error: 'Failed to apply negative impact' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  if (!['manager', 'owner'].includes(context.role)) {
    return NextResponse.json({ error: 'Only Managers and Owners can reverse deductions' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { impactId, reversalReason } = body;

    if (!impactId || !reversalReason) {
      return NextResponse.json({ error: 'impactId and reversalReason required' }, { status: 400 });
    }

    const updated = await prisma.employeeNegativeImpact.update({
      where: { id: impactId },
      data: {
        status: 'Reversed',
        reversalReason,
        reversedByMembershipId: context.membershipId,
        reversedAt: new Date(),
      },
    });

    await logAuditEvent({
      organizationId: context.organizationId,
      actorMembershipId: context.membershipId,
      actorName: context.user.name,
      module: 'KPI',
      action: `Reversed negative impact deduction (${impactId})`,
      details: reversalReason,
    });

    return NextResponse.json({ success: true, impact: updated });
  } catch (err) {
    console.error('Error reversing negative impact:', err);
    return NextResponse.json({ error: 'Failed to reverse negative impact' }, { status: 500 });
  }
}
