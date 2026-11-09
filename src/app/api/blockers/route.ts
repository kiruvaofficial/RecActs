export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import prisma from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  try {
    const blockers = await prisma.blocker.findMany({
      where: { organizationId: context.organizationId },
      include: {
        ticket: true,
        raisedBy: { include: { user: true } },
        responsibleLead: { include: { user: true } },
        escalatedTo: { include: { user: true } },
        events: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = blockers.map((b) => ({
      id: b.id,
      ticketRef: b.reference || b.ticket?.reference || '—',
      title: b.title,
      description: b.description,
      severity: b.severity,
      status: b.status,
      raisedBy: b.raisedBy.user.name,
      raisedByInitials: b.raisedBy.user.initials,
      responsibleLead: b.responsibleLead?.user.name || 'Unassigned',
      escalatedToManager: b.escalatedToManager,
      escalatedToName: b.escalatedTo?.user.name || null,
      resolutionNotes: b.resolutionNotes,
      createdAt: b.createdAt,
      events: b.events,
    }));

    return NextResponse.json({ blockers: formatted });
  } catch (err) {
    console.error('Error fetching blockers:', err);
    return NextResponse.json({ error: 'Failed to fetch blockers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  try {
    const body = await req.json();
    const { ticketRef, title, description, severity } = body;

    if (!title || !description) {
      return NextResponse.json({ error: 'title and description required' }, { status: 400 });
    }

    let ticketId: string | null = null;
    let responsibleLeadId = context.membership?.reportingLeadId || null;

    if (ticketRef) {
      const ticket = await prisma.ticket.findFirst({
        where: { organizationId: context.organizationId, reference: ticketRef },
        include: { createdBy: true },
      });
      if (ticket) {
        ticketId = ticket.id;
        if (!responsibleLeadId && ticket.createdByMembershipId) {
          responsibleLeadId = ticket.createdByMembershipId;
        }
      }
    }

    const blocker = await prisma.blocker.create({
      data: {
        organizationId: context.organizationId,
        ticketId,
        reference: ticketRef || null,
        title,
        description,
        severity: severity || 'Medium',
        raisedByMembershipId: context.membershipId,
        responsibleLeadMembershipId: responsibleLeadId,
        status: 'Raised',
      },
    });

    // Record initial event
    await prisma.blockerEvent.create({
      data: {
        blockerId: blocker.id,
        actorName: context.user.name,
        action: 'Raised',
        notes: `Severity: ${severity || 'Medium'}`,
      },
    });

    // Notify Responsible Lead
    if (responsibleLeadId) {
      await prisma.notification.create({
        data: {
          organizationId: context.organizationId,
          recipientMembershipId: responsibleLeadId,
          title: `Blocker raised: ${severity || 'Medium'}`,
          body: `${context.user.name} raised a blocker: "${title}".`,
          targetModule: 'blockers',
          targetEntityId: blocker.id,
        },
      });
    }

    await logAuditEvent({
      organizationId: context.organizationId,
      actorMembershipId: context.membershipId,
      actorName: context.user.name,
      module: 'Blockers',
      action: `Raised blocker: ${title} (${severity})`,
    });

    return NextResponse.json({ success: true, blocker });
  } catch (err) {
    console.error('Error raising blocker:', err);
    return NextResponse.json({ error: 'Failed to raise blocker' }, { status: 500 });
  }
}
