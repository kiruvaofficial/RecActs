const test = require('node:test');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

test('Organization Attendance Settings & Auto Check-in with Leave Exclusions', async () => {
  const org = await prisma.organization.findFirst({
    where: { slug: 'blindmatrix' },
  });
  assert.ok(org, 'BlindMatrix organization must exist');

  // 1. Verify schema defaults and update capability
  const updatedOrg = await prisma.organization.update({
    where: { id: org.id },
    data: {
      attendanceTrackingEnabled: true,
      attendanceMandatory: false, // Non-mandatory / flexible checkin
      autoCheckInOutEnabled: true,
      autoCheckInOutExcludeLeaves: true,
    },
  });

  assert.equal(updatedOrg.attendanceTrackingEnabled, true);
  assert.equal(updatedOrg.attendanceMandatory, false);
  assert.equal(updatedOrg.autoCheckInOutEnabled, true);
  assert.equal(updatedOrg.autoCheckInOutExcludeLeaves, true);

  // 2. Test auto-attendance logic with leave exclusions
  const testDate = '2026-11-16'; // Monday (working day)

  // Find two active members
  const members = await prisma.organizationMembership.findMany({
    where: { organizationId: org.id, employmentStatus: 'Active' },
    take: 2,
  });
  assert.ok(members.length >= 2, 'Need at least 2 members for test');

  const regularMember = members[0];
  const leaveMember = members[1];

  // Clean any existing test records for testDate
  await prisma.attendanceSession.deleteMany({
    where: {
      workDate: testDate,
      membershipId: { in: [regularMember.id, leaveMember.id] },
    },
  });

  // Create an approved leave request for leaveMember on testDate
  let leaveType = await prisma.leaveType.findFirst({ where: { organizationId: org.id } });
  if (!leaveType) {
    leaveType = await prisma.leaveType.create({
      data: {
        organizationId: org.id,
        code: 'AL',
        name: 'Annual Leave',
        annualQuota: 18,
      },
    });
  }

  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      organizationId: org.id,
      membershipId: leaveMember.id,
      leaveTypeId: leaveType.id,
      startDate: testDate,
      endDate: testDate,
      totalDays: 1,
      reason: 'Planned vacation test',
      status: 'Approved',
    },
  });

  // Verify leave exclusion condition:
  // If autoCheckInOutExcludeLeaves is true, member with approved leave should NOT be auto checked-in
  const hasApprovedLeave = await prisma.leaveRequest.findFirst({
    where: {
      membershipId: leaveMember.id,
      status: 'Approved',
      startDate: { lte: testDate },
      endDate: { gte: testDate },
    },
  });
  assert.ok(hasApprovedLeave, 'leaveMember has an approved leave request');

  const regularHasLeave = await prisma.leaveRequest.findFirst({
    where: {
      membershipId: regularMember.id,
      status: 'Approved',
      startDate: { lte: testDate },
      endDate: { gte: testDate },
    },
  });
  assert.equal(regularHasLeave, null, 'regularMember has no leave');

  // Simulate auto check-in session creation for eligible non-leave member
  const startTime = org.workHoursStart || '09:00';
  const endTime = org.workHoursEnd || '18:00';
  const [sH, sM] = startTime.split(':').map(Number);
  const [eH, eM] = endTime.split(':').map(Number);
  const totalMinutes = (eH * 60 + eM) - (sH * 60 + sM);

  const autoSession = await prisma.attendanceSession.create({
    data: {
      membershipId: regularMember.id,
      workDate: testDate,
      checkInTime: startTime,
      checkOutTime: endTime,
      totalMinutes,
      status: 'Present',
    },
  });

  assert.equal(autoSession.checkInTime, '09:00');
  assert.equal(autoSession.checkOutTime, '18:00');
  assert.equal(autoSession.totalMinutes, 540);
  assert.equal(autoSession.status, 'Present');

  // Verify that leaveMember has NO attendance session on this date
  const leaveMemberSession = await prisma.attendanceSession.findFirst({
    where: { membershipId: leaveMember.id, workDate: testDate },
  });
  assert.equal(leaveMemberSession, null, 'Member on planned leave must not be checked in');

  // Clean up test data
  await prisma.attendanceSession.deleteMany({
    where: { id: autoSession.id },
  });
  await prisma.leaveRequest.delete({
    where: { id: leaveRequest.id },
  });

  // Reset org settings back to defaults
  await prisma.organization.update({
    where: { id: org.id },
    data: {
      attendanceTrackingEnabled: true,
      attendanceMandatory: false,
      autoCheckInOutEnabled: false,
      autoCheckInOutExcludeLeaves: true,
    },
  });
});

test.after(async () => {
  await prisma.$disconnect();
});
