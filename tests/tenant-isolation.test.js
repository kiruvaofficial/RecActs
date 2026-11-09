const test = require('node:test');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

test('Multi-Tenant Isolation: Queries enforce organization_id boundary', async () => {
  // Find BlindMatrix org
  const blindmatrix = await prisma.organization.findUnique({
    where: { slug: 'blindmatrix' },
  });
  assert.ok(blindmatrix, 'BlindMatrix organization should exist');

  // Find another tenant (Northwind Labs)
  const northwind = await prisma.organization.findUnique({
    where: { slug: 'northwind' },
  });
  assert.ok(northwind, 'Northwind organization should exist');

  // Query tickets scoped to BlindMatrix
  const bmTickets = await prisma.ticket.findMany({
    where: { organizationId: blindmatrix.id },
  });

  // Query tickets scoped to Northwind
  const nwTickets = await prisma.ticket.findMany({
    where: { organizationId: northwind.id },
  });

  assert.ok(bmTickets.length > 0, 'BlindMatrix has seeded tickets');
  assert.equal(nwTickets.length, 0, 'Northwind should have 0 tickets from BlindMatrix');

  // Every ticket retrieved under BlindMatrix MUST match blindmatrix.id
  for (const t of bmTickets) {
    assert.equal(t.organizationId, blindmatrix.id, 'Ticket organizationId must strictly match tenant');
  }

  // Cross-tenant attendance verification
  const bmAttendance = await prisma.attendanceSession.findMany({
    where: { membership: { organizationId: blindmatrix.id } },
  });

  const nwAttendance = await prisma.attendanceSession.findMany({
    where: { membership: { organizationId: northwind.id } },
  });

  assert.ok(bmAttendance.length > 0, 'BlindMatrix has attendance');
  assert.equal(nwAttendance.length, 0, 'Northwind has 0 attendance records');
});

test.after(async () => {
  await prisma.$disconnect();
});
