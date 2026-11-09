const test = require('node:test');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

test('Shared Tickets: Individual allocations do not double-count total weightage', async () => {
  // Find shared ticket REQ-SHARED-01 (Dealer portal – bulk quote import)
  const ticket = await prisma.ticket.findFirst({
    where: { reference: 'REQ-SHARED-01' },
    include: {
      assignments: {
        include: { membership: { include: { user: true } } },
      },
    },
  });

  assert.ok(ticket, 'REQ-SHARED-01 ticket must exist');
  assert.equal(ticket.totalEstimatedHours, 22.0, 'Total weightage must be 22 hours');
  assert.equal(ticket.assignments.length, 2, 'Must have 2 assignees');

  // Verify allocations: Yogesh = 10h, Hemanth = 12h
  const yogeshAlloc = ticket.assignments.find((a) => a.membership.user.name.includes('Yogesh'));
  const hemanthAlloc = ticket.assignments.find((a) => a.membership.user.name.includes('Hemanth'));

  assert.ok(yogeshAlloc, 'Yogesh must be an assignee');
  assert.ok(hemanthAlloc, 'Hemanth must be an assignee');

  assert.equal(yogeshAlloc.allocatedHours, 10.0);
  assert.equal(hemanthAlloc.allocatedHours, 12.0);

  // The sum of individual allocations equals total estimated weightage exactly
  const sumAllocations = yogeshAlloc.allocatedHours + hemanthAlloc.allocatedHours;
  assert.equal(sumAllocations, ticket.totalEstimatedHours, 'Sum of individual allocations matches total weightage');

  // Verify each assignee logs effort independently
  assert.equal(typeof yogeshAlloc.loggedHours, 'number');
  assert.equal(typeof hemanthAlloc.loggedHours, 'number');
});

test.after(async () => {
  await prisma.$disconnect();
});
