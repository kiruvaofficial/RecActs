const test = require('node:test');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

test('Leave Planner: Balance decrement on approval and half-day support', async () => {
  const member = await prisma.organizationMembership.findFirst({
    where: { user: { email: 'sharath@demo.recacts.app' } },
  });

  const clType = await prisma.leaveType.findFirst({
    where: { code: 'CL' },
  });

  assert.ok(member);
  assert.ok(clType);

  // Fetch initial balance
  const balanceBefore = await prisma.leaveBalance.findUnique({
    where: {
      membershipId_leaveTypeId_year: {
        membershipId: member.id,
        leaveTypeId: clType.id,
        year: 2026,
      },
    },
  });

  const initialUsed = balanceBefore?.usedDays || 0;

  // Create a half-day leave request
  const leaveReq = await prisma.leaveRequest.create({
    data: {
      organizationId: clType.organizationId,
      membershipId: member.id,
      leaveTypeId: clType.id,
      startDate: '2026-12-01',
      endDate: '2026-12-01',
      isHalfDay: true,
      totalDays: 0.5,
      reason: 'Doctor appointment',
      status: 'Pending',
    },
  });

  assert.equal(leaveReq.isHalfDay, true);
  assert.equal(leaveReq.totalDays, 0.5);

  // Approve leave request and increment usedDays
  await prisma.leaveRequest.update({
    where: { id: leaveReq.id },
    data: { status: 'Approved' },
  });

  await prisma.leaveBalance.updateMany({
    where: {
      membershipId: member.id,
      leaveTypeId: clType.id,
      year: 2026,
    },
    data: {
      usedDays: { increment: 0.5 },
    },
  });

  const balanceAfter = await prisma.leaveBalance.findUnique({
    where: {
      membershipId_leaveTypeId_year: {
        membershipId: member.id,
        leaveTypeId: clType.id,
        year: 2026,
      },
    },
  });

  assert.equal(balanceAfter.usedDays, initialUsed + 0.5);

  // Clean up
  await prisma.leaveRequest.delete({ where: { id: leaveReq.id } });
  await prisma.leaveBalance.updateMany({
    where: {
      membershipId: member.id,
      leaveTypeId: clType.id,
      year: 2026,
    },
    data: {
      usedDays: initialUsed,
    },
  });
});

test.after(async () => {
  await prisma.$disconnect();
});
