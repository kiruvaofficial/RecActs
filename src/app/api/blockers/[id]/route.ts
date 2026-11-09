import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import prisma from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  try {
    const { id } = params;
    const body = await req.json();
    const { action, notes } = body; // action: 'acknowledge' | 'resolve' | 'escalate'

    const blocker = await prisma.blocker.findUnique({
      where: { id },
      include: { raisedBy: { include: { user: true } } },
    });

    if (!blocker) {
      return NextResponse.json({ error: 'Blocker not found' }, { status: 404 });
    }

    let updatedData: any = {};
    let eventAction = '';

    if (action === 'acknowledge') {
      updatedData = { status: 'Acknowledged' };
      eventAction = 'Acknowledged';
    } else if (action === 'resolve') {
      updatedData = {
        status: 'Resolved',
        resolutionNotes: notes || 'Resolved by lead',
        resolvedAt: new Date(),
      };
      eventAction = 'Resolved';
    } else if (action === 'escalate') {
      // Find manager of the organization
      const managerMember = await prisma.organizationMembership.findFirst({
        where: {
          organizationId: context.organizationId,
          designation: 'Manager',
        },
      });

      updatedData = {
        escalatedToManager: true,
        escalatedToMembershipId: managerMember?.id || null,
        status: 'In Progress',
      };
      eventAction = 'Escalated to Manager';

      if (managerMember) {
        await prisma.notification.create({
          data: {
            organizationId: context.organizationId,
            recipientMembershipId: managerMember.id,
            title: `Blocker escalated: ${blocker.title}`,
            body: `${context.user.name} escalated blocker "${blocker.title}" for your attention.`,
            targetModule: 'blockers',
            targetEntityId: blocker.id,
          },
        });
      }
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updated = await prisma.blocker.update({
      where: { id },
      data: updatedData,
    });

    await prisma.blockerEvent.create({
      data: {
        blockerId: id,
        actorName: context.user.name,
        action: eventAction,
        notes: notes || null,
      },
    });

    await logAuditEvent({
      organizationId: context.organizationId,
      actorMembershipId: context.membershipId,
      actorName: context.user.name,
      module: 'Blockers',
      action: `${eventAction}: ${blocker.title}`,
      details: notes || undefined,
    });

    return NextResponse.json({ success: true, blocker: updated });
  } catch (err) {
    console.error('Error updating blocker:', err);
    return NextResponse.json({ error: 'Failed to update blocker' }, { status: 500 });
  }
}
