export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import { hasPermission, FunctionalRole } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  try {
    const { id } = params;
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        team: true,
        assignments: {
          include: {
            membership: { include: { user: true } },
          },
        },
        dependencies: {
          include: { dependsOn: true },
        },
        dependents: {
          include: { ticket: true },
        },
        blockers: true,
        history: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

    return NextResponse.json({ ticket });
  } catch (err) {
    console.error('Error fetching ticket details:', err);
    return NextResponse.json({ error: 'Failed to fetch ticket' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  try {
    const { id } = params;
    const body = await req.json();
    const { status, priority, plannedDueDate, reassignFromMemberId, reassignToMemberId, reassignHours } = body;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { assignments: true },
    });

    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

    const isAssigned = ticket.assignments.some((a) => a.membershipId === context.membershipId);
    const canEdit = hasPermission(context.role as FunctionalRole, 'tickets:edit');

    // Only leads/managers/owners can modify priority, due dates, or reassignments, or edit tickets they aren't assigned to
    if (
      !canEdit &&
      (priority || plannedDueDate || reassignFromMemberId || reassignToMemberId || reassignHours || !isAssigned)
    ) {
      return NextResponse.json(
        { error: 'Unauthorized: Insufficient permissions to modify this requirement ticket' },
        { status: 403 }
      );
    }

    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === 'Completed') updateData.completedDate = new Date().toISOString().split('T')[0];
    }
    if (priority) updateData.priority = priority;
    if (plannedDueDate) updateData.plannedDueDate = plannedDueDate;

    // Handle reassignment if requested
    if (reassignFromMemberId && reassignToMemberId && reassignHours) {
      const fromAssign = await prisma.ticketAssignment.findUnique({
        where: {
          ticketId_membershipId: {
            ticketId: id,
            membershipId: reassignFromMemberId,
          },
        },
      });

      if (fromAssign && fromAssign.allocatedHours >= Number(reassignHours)) {
        // Decrement source
        await prisma.ticketAssignment.update({
          where: { id: fromAssign.id },
          data: {
            allocatedHours: fromAssign.allocatedHours - Number(reassignHours),
          },
        });

        // Increment target
        await prisma.ticketAssignment.upsert({
          where: {
            ticketId_membershipId: {
              ticketId: id,
              membershipId: reassignToMemberId,
            },
          },
          update: {
            allocatedHours: { increment: Number(reassignHours) },
          },
          create: {
            ticketId: id,
            membershipId: reassignToMemberId,
            allocatedHours: Number(reassignHours),
            loggedHours: 0,
          },
        });

        updateData.reassignmentCount = { increment: 1 };

        // Apply 5% negative impact for reassignment under standard rule
        await prisma.employeeNegativeImpact.create({
          data: {
            organizationId: context.organizationId,
            membershipId: reassignFromMemberId,
            ticketId: id,
            category: 'Reassignment',
            impactValue: 5.0,
            valueType: 'percentage',
            basisRule: 'First reassignment: 5%',
            reason: `Reassigned ${reassignHours}h on ${ticket.reference} to another team member`,
            effectiveDate: new Date().toISOString().split('T')[0],
            appliedByMembershipId: context.membershipId,
            status: 'Approved',
          },
        });

        // Add history entry
        await prisma.ticketHistory.create({
          data: {
            ticketId: id,
            actorName: context.user.name,
            action: 'Reassigned',
            details: `Reassigned ${reassignHours}h from member to peer (5% deduction applied)`,
          },
        });
      }
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: updateData,
    });

    if (status) {
      await prisma.ticketHistory.create({
        data: {
          ticketId: id,
          actorName: context.user.name,
          action: 'Status Updated',
          details: `Status transitioned to ${status}`,
        },
      });
    }

    await logAuditEvent({
      organizationId: context.organizationId,
      actorMembershipId: context.membershipId,
      actorName: context.user.name,
      module: 'Tickets',
      action: `Updated ticket ${ticket.reference} (Status: ${status || ticket.status})`,
    });

    return NextResponse.json({ success: true, ticket: updated });
  } catch (err) {
    console.error('Error updating ticket:', err);
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
  }
}
