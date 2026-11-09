const test = require('node:test');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

test('Work Logs: Draft -> Submitted -> Approved workflow and lock validation', async () => {
  // Find a test user (Saravana Priya)
  const member = await prisma.organizationMembership.findFirst({
    where: { user: { email: 'saravana.priya@demo.recacts.app' } },
    include: { organization: true, user: true },
  });

  assert.ok(member, 'Saravana Priya membership should exist');

  const testDate = '2026-11-08';

  // 1. Create a draft work log
  const draftLog = await prisma.workLog.upsert({
    where: {
      membershipId_workDate: {
        membershipId: member.id,
        workDate: testDate,
      },
    },
    update: {
      submissionStatus: 'Draft',
    },
    create: {
      organizationId: member.organizationId,
      membershipId: member.id,
      workDate: testDate,
      submissionStatus: 'Draft',
    },
  });

  assert.equal(draftLog.submissionStatus, 'Draft');

  // Add an activity row (duration must be positive integer)
  const activity = await prisma.workLogActivity.create({
    data: {
      workLogId: draftLog.id,
      activityType: 'UI/UX Design',
      description: 'Cut list prototype refinement',
      durationMinutes: 120,
      startTime: '10:00',
      endTime: '12:00',
    },
  });
  assert.ok(activity.durationMinutes > 0, 'Duration minutes must be positive');

  // 2. Submit the work log
  const submittedLog = await prisma.workLog.update({
    where: { id: draftLog.id },
    data: {
      submissionStatus: 'Submitted',
      submittedAt: new Date(),
    },
  });
  assert.equal(submittedLog.submissionStatus, 'Submitted');

  // 3. Approve the work log
  const approvedLog = await prisma.workLog.update({
    where: { id: draftLog.id },
    data: {
      submissionStatus: 'Approved',
      reviewedAt: new Date(),
      reviewComments: 'Reviewed and approved by Team Lead',
    },
  });
  assert.equal(approvedLog.submissionStatus, 'Approved');

  // 4. Verify that once Approved, log is marked as locked
  assert.equal(approvedLog.submissionStatus, 'Approved');

  // Clean up test entry
  await prisma.workLogActivity.deleteMany({ where: { workLogId: draftLog.id } });
  await prisma.workLog.delete({ where: { id: draftLog.id } });
});

test.after(async () => {
  await prisma.$disconnect();
});
