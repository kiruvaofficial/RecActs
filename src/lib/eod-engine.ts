import prisma from './prisma';

export interface EodGenerationOptions {
  organizationId: string;
  membershipId: string;
  workDate: string; // YYYY-MM-DD
  planTomorrow?: string;
  forceRegenerate?: boolean;
}

export async function generateAndSendEodReport(options: EodGenerationOptions) {
  const { organizationId, membershipId, workDate, planTomorrow } = options;

  // 1. Fetch membership with user, team, lead, and manager
  const member = await prisma.organizationMembership.findUnique({
    where: { id: membershipId },
    include: {
      user: true,
      team: true,
      organization: true,
    },
  });

  if (!member) throw new Error('Membership not found');

  // 2. Fetch Attendance for the day
  const sessions = await prisma.attendanceSession.findMany({
    where: {
      membershipId,
      workDate,
    },
  });
  const totalAttMinutes = sessions.reduce((acc, s) => acc + s.totalMinutes, 0);
  const attendanceHours = Number((totalAttMinutes / 60).toFixed(2));

  // 3. Fetch Work Logs for the day
  const workLog = await prisma.workLog.findUnique({
    where: {
      membershipId_workDate: {
        membershipId,
        workDate,
      },
    },
    include: {
      activities: {
        include: {
          ticket: true,
        },
      },
    },
  });

  const totalLoggedMinutes =
    workLog?.activities.reduce((acc, a) => acc + a.durationMinutes, 0) ?? 0;
  const loggedHours = Number((totalLoggedMinutes / 60).toFixed(2));

  // 4. Resolve Recipients (Reporting Lead, Manager)
  const recipientsList: string[] = [];
  if (member.reportingLeadId) {
    const lead = await prisma.organizationMembership.findUnique({
      where: { id: member.reportingLeadId },
      include: { user: true },
    });
    if (lead) recipientsList.push(`${lead.user.name} <${lead.user.email}>`);
  }
  if (member.reportingManagerId && member.reportingManagerId !== member.reportingLeadId) {
    const mgr = await prisma.organizationMembership.findUnique({
      where: { id: member.reportingManagerId },
      include: { user: true },
    });
    if (mgr) recipientsList.push(`${mgr.user.name} <${mgr.user.email}>`);
  }
  if (recipientsList.length === 0) {
    recipientsList.push('Leadership <support@demo.recacts.app>');
  }

  // 5. Create or Upsert EOD record
  const eod = await prisma.eodReport.upsert({
    where: {
      membershipId_reportDate: {
        membershipId,
        reportDate: workDate,
      },
    },
    update: {
      attendanceHours,
      loggedHours,
      submissionStatus: workLog?.submissionStatus || 'Not Submitted',
      approvalStatus: workLog?.submissionStatus === 'Approved' ? 'Approved' : 'Pending',
      planTomorrow: planTomorrow || 'Continue ticket development and sprint activities',
      recipients: recipientsList.join(', '),
      deliveryStatus: 'Delivered',
      sentAt: new Date(),
    },
    create: {
      organizationId,
      membershipId,
      reportDate: workDate,
      attendanceHours,
      loggedHours,
      submissionStatus: workLog?.submissionStatus || 'Not Submitted',
      approvalStatus: workLog?.submissionStatus === 'Approved' ? 'Approved' : 'Pending',
      planTomorrow: planTomorrow || 'Continue ticket development and sprint activities',
      recipients: recipientsList.join(', '),
      deliveryStatus: 'Delivered',
    },
  });

  return eod;
}
