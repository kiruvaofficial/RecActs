import { NextRequest, NextResponse } from 'next/server';
import { requireGodContext } from '@/lib/tenant';
import prisma from '@/lib/prisma';
import { logPlatformAuditEvent } from '@/lib/audit';

export async function GET() {
  const { error, context } = await requireGodContext();
  if (error || !context) return error;

  try {
    const orgs = await prisma.organization.findMany({
      include: {
        _count: {
          select: { memberships: true, tickets: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = orgs.map((o) => ({
      id: o.id,
      slug: o.slug,
      name: o.name,
      plan: o.subscriptionTier,
      status: o.subscriptionStatus,
      userCount: o._count.memberships,
      ticketCount: o._count.tickets,
      timezone: o.timezone,
      createdAt: o.createdAt,
    }));

    return NextResponse.json({ organizations: formatted });
  } catch (err) {
    console.error('Error fetching god mode orgs:', err);
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { error, context } = await requireGodContext();
  if (error || !context) return error;

  try {
    const body = await req.json();
    const { orgId, status, plan } = body;

    const data: any = {};
    if (status) data.subscriptionStatus = status;
    if (plan) data.subscriptionTier = plan;

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data,
    });

    await logPlatformAuditEvent(
      'Platform Admin',
      `Updated organization ${updated.name} (Status: ${updated.subscriptionStatus}, Plan: ${updated.subscriptionTier})`,
      'Organizations'
    );

    return NextResponse.json({ success: true, organization: updated });
  } catch (err) {
    console.error('Error updating organization:', err);
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 });
  }
}
