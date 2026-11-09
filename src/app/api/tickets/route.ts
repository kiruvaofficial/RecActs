import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import prisma from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  try {
    const tickets = await prisma.ticket.findMany({
      where: { organizationId: context.organizationId },
      include: {
        team: true,
        assignments: {
          include: {
            membership: {
              include: { user: true },
            },
          },
        },
        dependencies: {
          include: {
            dependsOn: true,
          },
        },
        blockers: true,
        history: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { plannedDueDate: 'asc' },
    });

    const formatted = tickets.map((t) => ({
      id: t.id,
      ref: t.reference,
      title: t.title,
      description: t.description,
      customer: t.customerName,
      priority: t.priority,
      status: t.status,
      plannedStart: t.plannedStartDate,
      plannedDue: t.plannedDueDate,
      totalWeightage: t.totalEstimatedHours,
      teamName: t.team?.name || 'Alpha',
      reassignmentCount: t.reassignmentCount,
      allocations: t.assignments.map((a) => ({
        id: a.id,
        memberId: a.membershipId,
        memberName: a.membership.user.name,
        memberInitials: a.membership.user.initials,
        allocatedHours: a.allocatedHours,
        loggedHours: a.loggedHours,
        status: a.status,
      })),
      dependencies: t.dependencies.map((d) => d.dependsOn.reference),
      hasBlocker: t.blockers.some((b) => b.status !== 'Resolved'),
      history: t.history,
    }));

    return NextResponse.json({ tickets: formatted });
  } catch (err) {
    console.error('Error fetching tickets:', err);
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  if (!['lead', 'manager', 'owner'].includes(context.role)) {
    return NextResponse.json({ error: 'Unauthorized to create tickets' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      reference,
      title,
      customerName,
      priority,
      status,
      plannedStartDate,
      plannedDueDate,
      totalEstimatedHours,
      teamName,
      description,
      allocations, // Array of { memberId, allocatedHours }
    } = body;

    if (!reference || !title || !customerName) {
      return NextResponse.json({ error: 'reference, title, customerName required' }, { status: 400 });
    }

    // Find team
    const team = await prisma.team.findFirst({
      where: { organizationId: context.organizationId, name: teamName || 'Alpha' },
    });

    const ticket = await prisma.ticket.create({
      data: {
        organizationId: context.organizationId,
        reference,
        title,
        customerName,
        priority: priority || 'Medium',
        status: status || 'To Do',
        plannedStartDate: plannedStartDate || '2026-11-09',
        plannedDueDate: plannedDueDate || '2026-11-20',
        totalEstimatedHours: Number(totalEstimatedHours || 0),
        teamId: team?.id || null,
        description: description || '',
        createdByMembershipId: context.membershipId,
      },
    });

    // Create shared allocations
    if (Array.isArray(allocations)) {
      for (const al of allocations) {
        await prisma.ticketAssignment.create({
          data: {
            ticketId: ticket.id,
            membershipId: al.memberId,
            allocatedHours: Number(al.allocatedHours || 0),
            loggedHours: 0,
          },
        });
      }
    }

    // Add initial history
    await prisma.ticketHistory.create({
      data: {
        ticketId: ticket.id,
        actorName: context.user.name,
        action: 'Created',
        details: `Ticket created with ${allocations?.length || 0} shared allocation(s)`,
      },
    });

    await logAuditEvent({
      organizationId: context.organizationId,
      actorMembershipId: context.membershipId,
      actorName: context.user.name,
      module: 'Tickets',
      action: `Created ticket ${reference}: ${title}`,
    });

    return NextResponse.json({ success: true, ticket });
  } catch (err) {
    console.error('Error creating ticket:', err);
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }
}
