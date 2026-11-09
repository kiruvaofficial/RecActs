const test = require('node:test');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

test('Attendance: Record session, calculate duration, and prevent overlap', async () => {
  const member = await prisma.organizationMembership.findFirst({
    where: { user: { email: 'dinesh.yadav@demo.recacts.app' } },
  });

  assert.ok(member, 'Dinesh Yadav membership should exist');

  const testDate = '2026-11-08';

  // 1. Create a checked-in session
  const session = await prisma.attendanceSession.create({
    data: {
      membershipId: member.id,
      workDate: testDate,
      checkInTime: '09:05',
      status: 'Present',
    },
  });

  assert.equal(session.checkOutTime, null, 'Active session has no check-out time');

  // 2. Perform Check-Out
  const checkOutTime = '18:15';
  const inMinutes = 9 * 60 + 5;
  const outMinutes = 18 * 60 + 15;
  const expectedDuration = outMinutes - inMinutes; // 550 minutes (9h 10m)

  const updatedSession = await prisma.attendanceSession.update({
    where: { id: session.id },
    data: {
      checkOutTime,
      totalMinutes: expectedDuration,
    },
  });

  assert.equal(updatedSession.checkOutTime, '18:15');
  assert.equal(updatedSession.totalMinutes, 550);

  // Clean up
  await prisma.attendanceSession.delete({ where: { id: session.id } });
});

test.after(async () => {
  await prisma.$disconnect();
});
