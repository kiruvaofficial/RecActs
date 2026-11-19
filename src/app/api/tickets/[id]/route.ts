export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import { hasPermission, FunctionalRole } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';
import { invalidateBootstrapCache } from '@/lib/bootstrap';

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
    const {
      status,
      priority,
      plannedStartDate,
      plannedDueDate,
      requirementStartDate,
      requirementEndDate,
      devStartDate,
      devEndDate,
      targetLiveDate,
      department,
      designer,
      reassignFromMemberId,
      reassignToMemberId,
      reassignHours,
    } = body;

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
      (priority || plannedDueDate || plannedStartDate || requirementStartDate || requirementEndDate || devStartDate || devEndDate || targetLiveDate || reassignFromMemberId || reassignToMemberId || reassignHours || !isAssigned)
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
    if (plannedStartDate) updateData.plannedStartDate = plannedStartDate;

    // Custom layout fields update
    const currentCf = (ticket.customFields as any) || {};
    const currentRaw = (ticket.rawPayload as any) || {};
    let hasCustomFieldUpdates = false;

    if (requirementStartDate !== undefined) {
      hasCustomFieldUpdates = true;
      currentCf.UDF_DATETIME10 = {
        label: 'Requirement Start Date',
        rawValue: requirementStartDate ? `${requirementStartDate}T00:00:00.000Z` : '',
        displayValue: requirementStartDate ? `${requirementStartDate}T00:00:00.000Z` : '',
        fieldType: 'Date & Time',
        paramName: 'UDF_DATETIME10',
      };
      currentRaw.UDF_DATETIME10 = requirementStartDate ? `${requirementStartDate}T00:00:00.000Z` : '';
      if (!updateData.plannedStartDate && requirementStartDate) {
        updateData.plannedStartDate = requirementStartDate;
      }
    }

    if (requirementEndDate !== undefined) {
      hasCustomFieldUpdates = true;
      currentCf.UDF_DATETIME6 = {
        label: 'Requirement End Date',
        rawValue: requirementEndDate ? `${requirementEndDate}T00:00:00.000Z` : '',
        displayValue: requirementEndDate ? `${requirementEndDate}T00:00:00.000Z` : '',
        fieldType: 'Date & Time',
        paramName: 'UDF_DATETIME6',
      };
      currentRaw.UDF_DATETIME6 = requirementEndDate ? `${requirementEndDate}T00:00:00.000Z` : '';
      if (!updateData.plannedDueDate && requirementEndDate) {
        updateData.plannedDueDate = requirementEndDate;
      }
    }

    if (devStartDate !== undefined) {
      hasCustomFieldUpdates = true;
      currentCf.UDF_DATE4 = {
        label: 'Development Start Date',
        rawValue: devStartDate ? `${devStartDate}T00:00:00.000Z` : '',
        displayValue: devStartDate ? `${devStartDate}T00:00:00.000Z` : '',
        fieldType: 'Date',
        paramName: 'UDF_DATE4',
      };
      currentRaw.UDF_DATE4 = devStartDate ? `${devStartDate}T00:00:00.000Z` : '';
    }

    if (devEndDate !== undefined) {
      hasCustomFieldUpdates = true;
      currentCf.UDF_DATE3 = {
        label: 'Development end Date',
        rawValue: devEndDate ? `${devEndDate}T00:00:00.000Z` : '',
        displayValue: devEndDate ? `${devEndDate}T00:00:00.000Z` : '',
        fieldType: 'Date',
        paramName: 'UDF_DATE3',
      };
      currentRaw.UDF_DATE3 = devEndDate ? `${devEndDate}T00:00:00.000Z` : '';
    }

    if (targetLiveDate !== undefined) {
      hasCustomFieldUpdates = true;
      currentCf.UDF_DATE5 = {
        label: 'Target Live Date',
        rawValue: targetLiveDate ? `${targetLiveDate}T00:00:00.000Z` : '',
        displayValue: targetLiveDate ? `${targetLiveDate}T00:00:00.000Z` : '',
        fieldType: 'Date',
        paramName: 'UDF_DATE5',
      };
      currentRaw.UDF_DATE5 = targetLiveDate ? `${targetLiveDate}T00:00:00.000Z` : '';
    }

    if (department !== undefined) {
      hasCustomFieldUpdates = true;
      currentCf.UDF_PKL20 = {
        label: 'Department',
        rawValue: department,
        displayValue: department,
        fieldType: 'Picklist / Dropdown',
        paramName: 'UDF_PKL20',
      };
    }

    if (designer !== undefined) {
      hasCustomFieldUpdates = true;
      currentCf.UDF_MULTIPKL10 = {
        label: 'Designer',
        rawValue: designer,
        displayValue: designer,
        fieldType: 'Multi-Picklist',
        paramName: 'UDF_MULTIPKL10',
      };
    }

    if (hasCustomFieldUpdates) {
      updateData.customFields = currentCf;
      updateData.rawPayload = currentRaw;
    }

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

    invalidateBootstrapCache();

    return NextResponse.json({ success: true, ticket: updated });
  } catch (err) {
    console.error('Error updating ticket:', err);
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
  }
}
