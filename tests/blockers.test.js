const test = require('node:test');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

test('Blockers: Creation, escalation to Manager, and resolution with notes', async () => {
  const member = await prisma.organizationMembership.findFirst({
    where: { user: { email: 'hemanth@demo.recacts.app' } },
  });
  const manager = await prisma.organizationMembership.findFirst({
    where: { user: { email: 'don.michael@demo.recacts.app' } },
  });

  assert.ok(member);
  assert.ok(manager);

  // 1. Raise a blocker
  const blocker = await prisma.blocker.create({
    data: {
      organizationId: member.organizationId,
      reference: 'REQ-I3005',
      title: 'Missing sandbox API tokens',
      description: 'Harbor ops did not supply sandbox tokens',
      severity: 'High',
      raisedByMembershipId: member.id,
      status: 'Raised',
    },
  });

  assert.equal(blocker.status, 'Raised');
  assert.equal(blocker.escalatedToManager, false);

  // 2. Escalate to Manager
  const escalated = await prisma.blocker.update({
    where: { id: blocker.id },
    data: {
      escalatedToManager: true,
      escalatedToMembershipId: manager.id,
      status: 'In Progress',
    },
  });

  assert.equal(escalated.escalatedToManager, true);
  assert.equal(escalated.escalatedToMembershipId, manager.id);
  assert.equal(escalated.status, 'In Progress');

  // 3. Resolve blocker
  const resolved = await prisma.blocker.update({
    where: { id: blocker.id },
    data: {
      status: 'Resolved',
      resolutionNotes: 'Don Michael received tokens via direct contact with client CTO.',
      resolvedAt: new Date(),
    },
  });

  assert.equal(resolved.status, 'Resolved');
  assert.ok(resolved.resolutionNotes.length > 0);

  // Clean up
  await prisma.blocker.delete({ where: { id: blocker.id } });
});

test.after(async () => {
  await prisma.$disconnect();
});
