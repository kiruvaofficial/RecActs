import prisma from '@/lib/prisma';
import { processAutoAttendance } from '@/lib/auto-attendance';
import {
  calculateDepartmentKpi,
  calculateTicketDeduction,
  DEFAULT_KPI_SETTINGS,
  StaffKpiInput,
  KpiSettings,
} from '@/lib/kpi-engine';

interface CacheEntry {
  timestamp: number;
  data: any;
}

// In-memory cache with 20s TTL to eliminate redundant DB roundtrips and serialization overhead
const bootstrapCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 20_000;

export function getCachedBootstrap(key: string): any | null {
  const entry = bootstrapCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    bootstrapCache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCachedBootstrap(key: string, data: any): void {
  bootstrapCache.set(key, { timestamp: Date.now(), data });
  if (bootstrapCache.size > 200) {
    const now = Date.now();
    bootstrapCache.forEach((v, k) => {
      if (now - v.timestamp > CACHE_TTL_MS) {
        bootstrapCache.delete(k);
      }
    });
  }
}

export function invalidateBootstrapCache(organizationId?: string): void {
  if (!organizationId) {
    bootstrapCache.clear();
    return;
  }
  bootstrapCache.forEach((_, key) => {
    if (key.startsWith(organizationId)) {
      bootstrapCache.delete(key);
    }
  });
}

function formatMonthName(periodStr: string): string {
  const parts = periodStr.split('-');
  if (parts.length >= 2) {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const idx = parseInt(parts[1], 10) - 1;
    if (idx >= 0 && idx < 12) {
      return `${monthNames[idx]} ${parts[0]}`;
    }
  }
  return periodStr === '2026-10' ? 'October 2026' : 'November 2026';
}

export interface GetBootstrapParams {
  organizationId: string;
  membershipId: string;
  userId: string;
  role: string;
  user?: any;
  organization?: any;
  period?: string;
  workDate?: string;
  bypassCache?: boolean;
}

export async function getBootstrapData({
  organizationId,
  membershipId,
  userId,
  role,
  user,
  organization,
  period = '2026-10',
  workDate = '2026-10-31',
  bypassCache = false,
}: GetBootstrapParams): Promise<any> {
  const cacheKey = `${organizationId}:${membershipId}:${role}:${period}:${workDate}`;

  if (!bypassCache) {
    const cached = getCachedBootstrap(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const org = organization;
  const kpiSettings: KpiSettings = {
    workingDays: 22,
    dailyHours: 8,
    productiveFactor: (org?.productivityFactor || 90) / 100,
    capacityMember: (org?.capacityFactorMember || 100) / 100,
    capacityLead: (org?.capacityFactorLead || 90) / 100,
    capacityManager: (org?.capacityFactorManager || 80) / 100,
    deduction1Reassign: 0.05,
    deduction2Reassign: 0.1,
    deduction3Reassign: 0.1,
  };

  const teamFilter: any = { organizationId };
  if (role === 'member' && organization?.membership?.teamId) {
    teamFilter.teamId = organization.membership.teamId;
  }

  // Auto-record shift attendance for scheduled staff when policy enabled
  if (org?.autoCheckInOutEnabled) {
    await processAutoAttendance({
      organizationId,
      workDate,
      orgSettings: org,
    });
  }

  // Optimized parallel server queries with pruned field selections and bounded limits
  const [
    mySessions,
    teamMembers,
    correctionsRaw,
    workLogRaw,
    allOrgTickets,
    approvalLogsRaw,
    blockersRaw,
    leaveTypes,
    leaveBalances,
    myLeaveRequests,
    teamLeaveRequests,
    holidays,
    targetOverridesRaw,
    negativeImpactsRaw,
    eodHistoryRaw,
    allStaffForKpi,
  ] = await Promise.all([
    // 1. User Attendance Sessions
    prisma.attendanceSession.findMany({
      where: { membershipId, workDate },
      include: { breaks: true },
      orderBy: { createdAt: 'asc' },
    }),

    // 2. Team Shift Members Attendance
    prisma.organizationMembership.findMany({
      where: teamFilter,
      include: {
        user: true,
        team: true,
        attendanceSessions: { where: { workDate } },
        leaveRequests: {
          where: {
            status: 'Approved',
            startDate: { lte: workDate },
            endDate: { gte: workDate },
          },
          include: { leaveType: true },
        },
      },
      orderBy: { user: { name: 'asc' } },
    }),

    // 3. Attendance Corrections (pruned to recent 50)
    prisma.attendanceCorrection.findMany({
      where: { membership: { organizationId } },
      include: { membership: { include: { user: true, team: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),

    // 4. Daily Work Log
    prisma.workLog.findUnique({
      where: {
        membershipId_workDate: {
          membershipId,
          workDate,
        },
      },
      include: {
        activities: {
          include: { ticket: true },
        },
        approvalEvents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    }),

    // 5. All Requirement Tickets (optimized: omit unneeded full ticket history & prune blocker join)
    prisma.ticket.findMany({
      where: { organizationId },
      include: {
        team: true,
        assignments: {
          include: {
            membership: {
              include: { user: true },
            },
          },
        },
        dependencies: {
          include: { dependsOn: true },
        },
        blockers: {
          select: { status: true },
        },
        history: {
          take: 3,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { plannedDueDate: 'asc' },
    }),

    // 6. Submitted Approvals (pruned: only load workDate attendance for each member, bounded to 50)
    ['lead', 'manager', 'owner'].includes(role)
      ? prisma.workLog.findMany({
          where: {
            organizationId,
            ...(role === 'lead' ? { membership: { reportingLeadId: membershipId } } : {}),
          },
          include: {
            membership: {
              include: {
                user: true,
                team: true,
                attendanceSessions: {
                  where: { workDate },
                  select: { workDate: true, totalMinutes: true },
                },
              },
            },
            activities: {
              include: { ticket: true },
            },
            approvalEvents: {
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { workDate: 'desc' },
          take: 50,
        })
      : Promise.resolve([]),

    // 7. Live Blockers (bounded to recent 50)
    prisma.blocker.findMany({
      where: { organizationId },
      include: {
        ticket: true,
        raisedBy: { include: { user: true } },
        responsibleLead: { include: { user: true } },
        escalatedTo: { include: { user: true } },
        events: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),

    // 8. Leave Types
    prisma.leaveType.findMany({
      where: { organizationId },
    }),

    // 9. Leave Balances for user
    prisma.leaveBalance.findMany({
      where: { membershipId },
      include: { leaveType: true },
    }),

    // 10. User Leave Requests (bounded to 30)
    prisma.leaveRequest.findMany({
      where: { membershipId },
      include: { leaveType: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),

    // 11. Team Leave Requests (bounded to 50)
    prisma.leaveRequest.findMany({
      where: { organizationId },
      include: {
        membership: { include: { user: true, team: true } },
        leaveType: true,
      },
      orderBy: { startDate: 'asc' },
      take: 50,
    }),

    // 12. Public Holidays
    prisma.holiday.findMany({
      where: { organizationId },
      orderBy: { holidayDate: 'asc' },
    }),

    // 13. Target Overrides (bounded to 50)
    prisma.targetOverride.findMany({
      where: { organizationId },
      include: {
        membership: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),

    // 14. Negative Impacts (bounded to 50)
    prisma.employeeNegativeImpact.findMany({
      where: { organizationId },
      include: {
        membership: { include: { user: true } },
        ticket: true,
      },
      orderBy: { effectiveDate: 'desc' },
      take: 50,
    }),

    // 15. EOD Reports History (bounded to 20)
    prisma.eodReport.findMany({
      where: { organizationId },
      include: {
        membership: { include: { user: true } },
      },
      orderBy: { sentAt: 'desc' },
      take: 20,
    }),

    // 16. Staff for KPI calculation
    prisma.organizationMembership.findMany({
      where: {
        organizationId,
        employmentStatus: { not: 'Terminated' },
      },
      include: {
        user: true,
        team: true,
        ticketAssignments: {
          include: { ticket: true },
        },
        leaveRequests: {
          where: {
            status: 'Approved',
            startDate: { startsWith: period },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  // Format Attendance
  const activeSession = mySessions.find((s) => !s.checkOutTime);
  const totalMinutes = mySessions.reduce((acc, s) => acc + s.totalMinutes, 0);

  const teamAttendance = teamMembers.map((m) => {
    const session = m.attendanceSessions[0];
    const onLeave = m.leaveRequests.length > 0;
    let st = 'Not checked in';
    if (onLeave) st = 'On leave';
    else if (session) st = session.status;

    return {
      id: m.id,
      name: m.user.name,
      initials: m.user.initials,
      designation: m.designation,
      team: m.team?.name || '—',
      status: st,
      checkIn: session?.checkInTime || '—',
      checkOut: session?.checkOutTime || '—',
      totalMinutes: session?.totalMinutes || 0,
      leaveType: onLeave ? m.leaveRequests[0].leaveType.code : null,
    };
  });

  const attendanceFormatted = {
    workDate,
    isCheckedIn: Boolean(activeSession),
    totalMinutes,
    checkInTime: activeSession?.checkInTime || mySessions[0]?.checkInTime || null,
    checkOutTime: mySessions[mySessions.length - 1]?.checkOutTime || null,
    status: activeSession ? 'Present' : totalMinutes > 0 ? 'Checked Out' : 'Not checked in',
    activeSession: activeSession || null,
    teamAttendance,
    policy: {
      attendanceTrackingEnabled: org?.attendanceTrackingEnabled ?? true,
      attendanceMandatory: org?.attendanceMandatory ?? false,
      autoCheckInOutEnabled: org?.autoCheckInOutEnabled ?? false,
      autoCheckInOutExcludeLeaves: org?.autoCheckInOutExcludeLeaves ?? true,
    },
  };

  // Format Corrections
  const correctionsFormatted = correctionsRaw.map((c) => ({
    id: c.id,
    memberName: c.membership.user.name,
    teamName: c.membership.team?.name || 'Alpha',
    workDate: c.workDate,
    correctionType: c.correctionType,
    requestedTime: c.requestedTime,
    reason: c.reason,
    status: c.status,
    createdAt: c.createdAt,
  }));

  // Format Work Log
  const workLogFormatted = {
    submissionStatus: workLogRaw?.submissionStatus || 'Draft',
    activities: (workLogRaw?.activities || []).map((a) => ({
      id: a.id,
      ticketRef: a.ticket?.reference || 'REQ-I3001',
      activityType: a.activityType,
      description: a.description,
      startTime: a.startTime || '09:00',
      endTime: a.endTime || '10:00',
      durationMinutes: a.durationMinutes,
      progressStatus: a.progressStatus,
      blockerFlag: a.blockerFlag,
    })),
    history: workLogRaw?.approvalEvents || [],
  };

  // Format Tickets
  const ticketsFormatted = allOrgTickets.map((t) => ({
    id: t.id,
    ref: t.reference,
    title: t.title,
    description: t.description,
    customer: t.customerName,
    priority: t.priority,
    status: t.status,
    plannedStart: t.plannedStartDate,
    plannedDue: t.plannedDueDate,
    totalWeightage: t.totalEstimatedHours,
    teamName: t.team?.name || 'Alpha',
    reassignmentCount: t.reassignmentCount,
    allocations: t.assignments.map((a) => ({
      id: a.id,
      memberId: a.membershipId,
      memberName: a.membership.user.name,
      memberInitials: a.membership.user.initials,
      allocatedHours: a.allocatedHours,
      loggedHours: a.loggedHours,
      status: a.status,
    })),
    dependencies: t.dependencies.map((d) => d.dependsOn.reference),
    hasBlocker: t.blockers.some((b) => b.status !== 'Resolved'),
    history: t.history || [],
  }));

  // Format Approvals
  const approvalsFormatted = approvalLogsRaw.map((wl) => {
    const attSession = wl.membership.attendanceSessions.find((s: any) => s.workDate === wl.workDate);
    const attMinutes = attSession ? attSession.totalMinutes : 0;
    const loggedMinutes = wl.activities.reduce((acc: number, a: any) => acc + a.durationMinutes, 0);

    return {
      id: wl.id,
      memberId: wl.membership.id,
      memberName: wl.membership.user.name,
      memberInitials: wl.membership.user.initials,
      teamName: wl.membership.team?.name || 'Alpha',
      workDate: wl.workDate,
      submissionStatus: wl.submissionStatus,
      submittedAt: wl.submittedAt,
      attendanceMinutes: attMinutes,
      loggedMinutes,
      reviewComments: wl.reviewComments,
      activities: wl.activities.map((a: any) => ({
        id: a.id,
        ticketRef: a.ticket?.reference || 'General',
        ticketTitle: a.ticket?.title || '',
        activityType: a.activityType,
        description: a.description,
        durationMinutes: a.durationMinutes,
        startTime: a.startTime,
        endTime: a.endTime,
        progressStatus: a.progressStatus,
        blockerFlag: a.blockerFlag,
      })),
      events: wl.approvalEvents,
    };
  });

  // Format Blockers
  const blockersFormatted = blockersRaw.map((b) => ({
    id: b.id,
    ticketRef: b.reference || b.ticket?.reference || '—',
    title: b.title,
    description: b.description,
    severity: b.severity,
    status: b.status,
    raisedBy: b.raisedBy.user.name,
    raisedByInitials: b.raisedBy.user.initials,
    responsibleLead: b.responsibleLead?.user.name || 'Unassigned',
    escalatedToManager: b.escalatedToManager,
    escalatedToName: b.escalatedTo?.user.name || null,
    resolutionNotes: b.resolutionNotes,
    createdAt: b.createdAt,
    events: b.events,
  }));

  // Format Leave Data
  const leaveDataFormatted = {
    leaveTypes,
    balances: leaveBalances,
    myRequests: myLeaveRequests,
    teamRequests: teamLeaveRequests,
    holidays,
  };

  // Calculate KPI
  const memberNameMap: Record<string, string> = {};
  for (const m of allStaffForKpi) {
    memberNameMap[m.id] = m.user.name;
  }

  const requirementStaffNames = [
    'Kiruvantham C',
    'Rasiga Priya M',
    'Sharath',
    'Srinath',
    'Karuppaiah',
    'Dinesh Yadav',
    'Yogesh',
    'Hemanth',
    'Madhan R',
    'Saravana Priya',
    'Dharshana',
    'Don Michael',
  ];

  const targetMembers = allStaffForKpi.filter((m) =>
    requirementStaffNames.some((n) => m.user.name.toLowerCase().includes(n.toLowerCase().split(' ')[0]))
  );

  const staffInputs: StaffKpiInput[] = targetMembers.map((m) => {
    const name = m.user.name;
    const desig = m.designation.toLowerCase();

    let memberKpiRole: 'Designer' | 'Team Lead' | 'Manager' = 'Designer';
    let capacityPercent = kpiSettings.capacityMember;

    if (desig.includes('manager')) {
      memberKpiRole = 'Manager';
      capacityPercent = kpiSettings.capacityManager;
    } else if (desig.includes('lead')) {
      memberKpiRole = 'Team Lead';
      capacityPercent = kpiSettings.capacityLead;
    }

    const reportingTo =
      (m.reportingLeadId && memberNameMap[m.reportingLeadId]) ||
      (memberKpiRole === 'Team Lead' ? 'Don Michael' : null);

    const leaveDays = m.leaveRequests.reduce((acc, l) => acc + l.totalDays, 0);

    const completedAssignments = m.ticketAssignments.filter(
      (a) => a.ticket.status === 'Completed' || a.status === 'Completed'
    );

    const ticketsAssigned = m.ticketAssignments.length;
    const ticketsCompleted = completedAssignments.length;

    let assignedWeightage = 0;
    let totalDeduction = 0;
    let estHrsCompleted = 0;
    let actualHrsCompleted = 0;
    let reassignedTickets = 0;

    for (const a of completedAssignments) {
      const est = a.allocatedHours || a.ticket.totalEstimatedHours;
      const reassignCount = a.ticket.reassignmentCount;
      const act = a.loggedHours;

      assignedWeightage += est;
      estHrsCompleted += est;
      actualHrsCompleted += act;

      if (reassignCount > 0) reassignedTickets += 1;

      const { deduction } = calculateTicketDeduction(est, reassignCount, kpiSettings);
      totalDeduction += deduction;
    }

    const achievedWeightageNet = Number((assignedWeightage - totalDeduction).toFixed(2));

    return {
      staffId: m.id,
      name,
      department: 'Requirement',
      role: memberKpiRole,
      reportingTo,
      leaveDays,
      capacityPercent,
      assignedWeightage,
      weightageDeducted: Number(totalDeduction.toFixed(2)),
      achievedWeightageNet,
      ticketsAssigned,
      ticketsCompleted,
      reassignedTickets,
      estHrsCompleted,
      actualHrsCompleted,
    };
  });

  const { staffKpis, teamTotal } = calculateDepartmentKpi(staffInputs, kpiSettings);

  const individual =
    staffKpis.find((s) => s.staffId === membershipId) ||
    staffKpis.find((s) => s.staffId === userId) ||
    staffKpis[0];

  const kpiTicketsList = allOrgTickets.map((t) => {
    const primaryAssignee = t.assignments[0];
    const assigneeName = primaryAssignee?.membership.user.name || 'Unassigned';
    const est = t.totalEstimatedHours;
    const act = primaryAssignee?.loggedHours || 0;
    const reassign = t.reassignmentCount;
    const { deduction, netWeightage } = calculateTicketDeduction(est, reassign, kpiSettings);

    return {
      id: t.id,
      reference: t.reference,
      title: t.title,
      customer: t.customerName,
      assignedTo: assigneeName,
      department: 'Requirement',
      estimatedHours: est,
      actualHours: act,
      variance: Number((act - est).toFixed(1)),
      reassignCount: reassign,
      reassignDeductionPercent: reassign === 1 ? 5 : reassign >= 2 ? 10 : 0,
      weightageDeducted: deduction,
      netWeightage,
      achievedWeightage: t.status === 'Completed' ? netWeightage : 0,
      status: t.status,
    };
  });

  const kpiDataFormatted = {
    period,
    settings: {
      month: formatMonthName(period),
      workingDays: kpiSettings.workingDays,
      dailyHours: kpiSettings.dailyHours,
      productiveFactor: kpiSettings.productiveFactor,
      capacityMember: kpiSettings.capacityMember,
      capacityLead: kpiSettings.capacityLead,
      capacityManager: kpiSettings.capacityManager,
      deduction1Reassign: kpiSettings.deduction1Reassign,
      deduction2Reassign: kpiSettings.deduction2Reassign,
      deduction3Reassign: kpiSettings.deduction3Reassign,
      formula: 'Target = (Working Days - Leave Days) × Daily Hours (8) × Productive Factor (0.9) × Capacity %',
      note: 'Weightage: TL = average of reporting designers; Manager = equal average of reporting TLs.',
    },
    individual,
    staffKpis,
    teamTotal,
    tickets: kpiTicketsList,
  };

  // Format Target Overrides
  const overridesFormatted = targetOverridesRaw.map((o) => ({
    id: o.id,
    memberName: o.membership.user.name,
    period: o.period,
    calculatedTarget: o.calculatedTargetHours,
    revisedTarget: o.revisedTargetHours,
    reason: o.reason,
    status: o.status,
  }));

  // Format Negative Impacts
  const impactsFormatted = negativeImpactsRaw.map((n) => ({
    id: n.id,
    memberName: n.membership.user.name,
    category: n.category,
    impactValue: n.impactValue,
    valueType: n.valueType,
    reason: n.reason,
    basisRule: n.basisRule,
    effectiveDate: n.effectiveDate,
    status: n.status,
  }));

  // Format EOD History
  const eodFormatted = eodHistoryRaw.map((r) => ({
    id: r.id,
    date: r.reportDate,
    memberName: r.membership.user.name,
    recipients: r.recipients,
    attendanceHours: r.attendanceHours,
    loggedHours: r.loggedHours,
    submissionStatus: r.submissionStatus,
    deliveryStatus: r.deliveryStatus,
    errorMessage: r.errorMessage || '',
    sentAt: r.sentAt,
    retryCount: r.retryCount,
  }));

  const result = {
    attendance: attendanceFormatted,
    corrections: correctionsFormatted,
    workLog: workLogFormatted,
    tickets: ticketsFormatted,
    approvals: approvalsFormatted,
    blockers: blockersFormatted,
    leaveData: leaveDataFormatted,
    kpiData: kpiDataFormatted,
    targetOverrides: overridesFormatted,
    negativeImpacts: impactsFormatted,
    eodHistory: eodFormatted,
    settingsData: org,
  };

  setCachedBootstrap(cacheKey, result);
  return result;
}
