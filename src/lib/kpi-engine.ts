export interface KpiSettings {
  workingDays: number; // default 22
  dailyHours: number; // default 8
  productiveFactor: number; // default 0.9 (90%)
  capacityMember: number; // default 1.0 (100% -> target 158)
  capacityLead: number; // default 0.9 (90% -> target 143)
  capacityManager: number; // default 0.8 (80% -> target 127)
  deduction1Reassign: number; // default 0.05 (5%)
  deduction2Reassign: number; // default 0.10 (10%)
  deduction3Reassign: number; // default 0.10 (10%)
}

export const DEFAULT_KPI_SETTINGS: KpiSettings = {
  workingDays: 22,
  dailyHours: 8,
  productiveFactor: 0.9,
  capacityMember: 1.0,
  capacityLead: 0.9,
  capacityManager: 0.8,
  deduction1Reassign: 0.05,
  deduction2Reassign: 0.1,
  deduction3Reassign: 0.1,
};

/**
 * Calculates shift hours, break hours, and net daily working hours
 * based on (Shift Hour - Break Duration).
 */
export function calculateDailyWorkingHours(
  workHoursStart: string = '09:00',
  workHoursEnd: string = '18:00',
  breakDurationMinutes: number = 60
): {
  shiftHours: number;
  breakHours: number;
  dailyWorkingHours: number;
} {
  const [sH, sM] = (workHoursStart || '09:00').split(':').map(Number);
  const [eH, eM] = (workHoursEnd || '18:00').split(':').map(Number);

  let shiftMins = (eH * 60 + (eM || 0)) - (sH * 60 + (sM || 0));
  if (isNaN(shiftMins) || shiftMins <= 0) {
    shiftMins = !isNaN(sH) && !isNaN(eH) && eH < sH
      ? (24 * 60 - (sH * 60 + (sM || 0))) + (eH * 60 + (eM || 0))
      : 540;
  }

  const breakMins = Math.max(0, Number(breakDurationMinutes ?? 60));
  const netWorkingMins = Math.max(0, shiftMins - breakMins);

  return {
    shiftHours: Number((shiftMins / 60).toFixed(2)),
    breakHours: Number((breakMins / 60).toFixed(2)),
    dailyWorkingHours: Number((netWorkingMins / 60).toFixed(2)),
  };
}

export type KpiRating = 'Excellent' | 'Good' | 'Average' | 'Needs Improvement';

export function getRating(achievementPercent: number): KpiRating {
  if (achievementPercent >= 1.0) return 'Excellent';
  if (achievementPercent >= 0.8) return 'Good';
  if (achievementPercent >= 0.6) return 'Average';
  return 'Needs Improvement';
}

export function getRatingColor(rating: KpiRating): string {
  switch (rating) {
    case 'Excellent':
      return '#10B981'; // Green
    case 'Good':
      return '#3B82F6'; // Blue
    case 'Average':
      return '#F59E0B'; // Amber
    case 'Needs Improvement':
      return '#EF4444'; // Red
  }
}

export function calculateTicketDeduction(
  estHrs: number,
  reassignCount: number,
  settings: KpiSettings = DEFAULT_KPI_SETTINGS
): { deduction: number; netWeightage: number } {
  if (reassignCount <= 0) {
    return { deduction: 0, netWeightage: estHrs };
  }
  const rate =
    reassignCount === 1 ? settings.deduction1Reassign : settings.deduction2Reassign;
  const netWeightage = Math.round(estHrs * (1 - rate) * 10) / 10;
  const deduction = Number((estHrs - netWeightage).toFixed(1));
  return { deduction, netWeightage };
}

export interface StaffKpiInput {
  staffId: string;
  name: string;
  department: string;
  role: 'Designer' | 'Team Lead' | 'Manager';
  reportingTo?: string | null;
  leaveDays: number;
  capacityPercent: number; // e.g. 1.0, 0.9, 0.8
  assignedWeightage: number; // Total estimated hours of assigned tickets
  weightageDeducted: number; // Deductions from reassignments
  achievedWeightageNet: number; // Net completed weightage
  ticketsAssigned: number;
  ticketsCompleted: number;
  reassignedTickets: number;
  estHrsCompleted: number;
  actualHrsCompleted: number;
}

export interface StaffKpiResult {
  staffId: string;
  name: string;
  department: string;
  role: 'Designer' | 'Team Lead' | 'Manager';
  reportingTo?: string | null;
  kpiBasis: 'Own work' | 'Average of designers' | 'Average of TLs';
  availableDays: number;
  targetWeightage: number; // 158 for designers, or roll-up target 158 for TL/Manager evaluation
  ownTargetWeightage: number; // 158, 143, or 127 based on own capacity
  assignedWeightage: number;
  weightageDeducted: number;
  achievedWeightageNet: number;
  achievementPercent: number; // e.g. 1.4639 for 146.4%
  achievementDisplay: string; // e.g. "146.4%"
  ticketsAssigned: number;
  ticketsCompleted: number;
  reassignedTickets: number;
  estHrsCompleted: number;
  actualHrsCompleted: number;
  efficiencyPercent: number; // e.g. 1.1587 for 115.9%
  efficiencyDisplay: string;
  rating: KpiRating;
}

/**
 * Calculates Target Weightage based on formula:
 * Target = (Working days - Leave days) * Hours per day * Productive factor * Capacity %
 * With 22 days, 8 hrs, 0.9 factor:
 * - 1.0 capacity = round(22 * 8 * 0.9 * 1.0) = 158 hrs
 * - 0.9 capacity = round(22 * 8 * 0.9 * 0.9) = 143 hrs
 * - 0.8 capacity = round(22 * 8 * 0.9 * 0.8) = 127 hrs
 */
export function calculateTargetWeightage(
  workingDays: number = 22,
  leaveDays: number = 0,
  dailyHours: number = 8,
  productiveFactor: number = 0.9,
  capacityPercent: number = 1.0
): number {
  const availableDays = Math.max(0, workingDays - leaveDays);
  return Math.round(availableDays * dailyHours * productiveFactor * capacityPercent);
}

/**
 * Calculates complete Department KPI table matching the BlindMatrix spreadsheet rules:
 * 1. Designers: Own work. Target = 158. Net achieved = Completed Weightage - Reassign Deductions.
 * 2. Team Leads: Average of reporting designers (including zero-work). Target = 158.
 *    Ticket counts, Est Hrs, Actual Hrs remain totals.
 * 3. Manager: Equal average of reporting Team Leads. Target = 158.
 *    Ticket counts, Est Hrs, Actual Hrs remain totals across department.
 */
export function calculateDepartmentKpi(
  staffList: StaffKpiInput[],
  settings: KpiSettings = DEFAULT_KPI_SETTINGS
): {
  staffKpis: StaffKpiResult[];
  teamTotal: StaffKpiResult;
} {
  const standardDesignerTarget = calculateTargetWeightage(
    settings.workingDays,
    0,
    settings.dailyHours,
    settings.productiveFactor,
    settings.capacityMember
  ); // 158

  // Step 1: Calculate Designer own KPIs
  const designerResults = new Map<string, StaffKpiResult>();

  for (const s of staffList) {
    if (s.role === 'Designer') {
      const ownTarget = calculateTargetWeightage(
        settings.workingDays,
        s.leaveDays,
        settings.dailyHours,
        settings.productiveFactor,
        s.capacityPercent
      );
      const achievement = ownTarget > 0 ? s.achievedWeightageNet / ownTarget : 0;
      const efficiency =
        s.actualHrsCompleted > 0 ? s.estHrsCompleted / s.actualHrsCompleted : 1.0;

      designerResults.set(s.name, {
        staffId: s.staffId,
        name: s.name,
        department: s.department,
        role: 'Designer',
        reportingTo: s.reportingTo || null,
        kpiBasis: 'Own work',
        availableDays: settings.workingDays - s.leaveDays,
        targetWeightage: ownTarget,
        ownTargetWeightage: ownTarget,
        assignedWeightage: s.assignedWeightage,
        weightageDeducted: s.weightageDeducted,
        achievedWeightageNet: s.achievedWeightageNet,
        achievementPercent: achievement,
        achievementDisplay: `${(achievement * 100).toFixed(1)}%`,
        ticketsAssigned: s.ticketsAssigned,
        ticketsCompleted: s.ticketsCompleted,
        reassignedTickets: s.reassignedTickets,
        estHrsCompleted: s.estHrsCompleted,
        actualHrsCompleted: s.actualHrsCompleted,
        efficiencyPercent: efficiency,
        efficiencyDisplay: `${(efficiency * 100).toFixed(1)}%`,
        rating: getRating(achievement),
      });
    }
  }

  // Step 2: Calculate Team Leads roll-up (Average of reporting designers)
  const leadResults = new Map<string, StaffKpiResult>();

  for (const s of staffList) {
    if (s.role === 'Team Lead') {
      const ownTarget = calculateTargetWeightage(
        settings.workingDays,
        s.leaveDays,
        settings.dailyHours,
        settings.productiveFactor,
        s.capacityPercent
      ); // 143

      // Find all reporting designers
      const reports = Array.from(designerResults.values()).filter(
        (d) => d.reportingTo === s.name
      );

      const numReports = reports.length || 1;
      const avgAssigned =
        reports.reduce((acc, r) => acc + r.assignedWeightage, 0) / numReports;
      const avgDeducted =
        reports.reduce((acc, r) => acc + r.weightageDeducted, 0) / numReports;
      const avgAchieved =
        reports.reduce((acc, r) => acc + r.achievedWeightageNet, 0) / numReports;

      // In spreadsheet: Target Weightage for TL evaluation is the standard Designer Target (158)
      const targetUsed = standardDesignerTarget;
      const achievement = targetUsed > 0 ? avgAchieved / targetUsed : 0;

      // Totals for tickets & hours
      const totAssigned = reports.reduce((acc, r) => acc + r.ticketsAssigned, 0);
      const totCompleted = reports.reduce((acc, r) => acc + r.ticketsCompleted, 0);
      const totReassigned = reports.reduce((acc, r) => acc + r.reassignedTickets, 0);
      const totEstHrs = reports.reduce((acc, r) => acc + r.estHrsCompleted, 0);
      const totActualHrs = reports.reduce((acc, r) => acc + r.actualHrsCompleted, 0);
      const efficiency = totActualHrs > 0 ? totEstHrs / totActualHrs : 1.0;

      leadResults.set(s.name, {
        staffId: s.staffId,
        name: s.name,
        department: s.department,
        role: 'Team Lead',
        reportingTo: s.reportingTo || null,
        kpiBasis: 'Average of designers',
        availableDays: settings.workingDays - s.leaveDays,
        targetWeightage: targetUsed,
        ownTargetWeightage: ownTarget,
        assignedWeightage: Number(avgAssigned.toFixed(2)),
        weightageDeducted: Number(avgDeducted.toFixed(4)),
        achievedWeightageNet: Number(avgAchieved.toFixed(4)),
        achievementPercent: achievement,
        achievementDisplay: `${(achievement * 100).toFixed(1)}%`,
        ticketsAssigned: totAssigned,
        ticketsCompleted: totCompleted,
        reassignedTickets: totReassigned,
        estHrsCompleted: totEstHrs,
        actualHrsCompleted: totActualHrs,
        efficiencyPercent: efficiency,
        efficiencyDisplay: `${(efficiency * 100).toFixed(1)}%`,
        rating: getRating(achievement),
      });
    }
  }

  // Step 3: Calculate Manager roll-up (Equal average of reporting Team Leads)
  const managerResults = new Map<string, StaffKpiResult>();

  for (const s of staffList) {
    if (s.role === 'Manager') {
      const ownTarget = calculateTargetWeightage(
        settings.workingDays,
        s.leaveDays,
        settings.dailyHours,
        settings.productiveFactor,
        s.capacityPercent
      ); // 127

      const reportingLeads = Array.from(leadResults.values()).filter(
        (l) => l.reportingTo === s.name || !s.reportingTo
      );

      const numLeads = reportingLeads.length || 1;
      const avgAssigned =
        reportingLeads.reduce((acc, l) => acc + l.assignedWeightage, 0) / numLeads;
      const avgDeducted =
        reportingLeads.reduce((acc, l) => acc + l.weightageDeducted, 0) / numLeads;
      const avgAchieved =
        reportingLeads.reduce((acc, l) => acc + l.achievedWeightageNet, 0) / numLeads;

      const targetUsed = standardDesignerTarget;
      const achievement = targetUsed > 0 ? avgAchieved / targetUsed : 0;

      // Totals across all leads
      const totAssigned = reportingLeads.reduce((acc, l) => acc + l.ticketsAssigned, 0);
      const totCompleted = reportingLeads.reduce((acc, l) => acc + l.ticketsCompleted, 0);
      const totReassigned = reportingLeads.reduce((acc, l) => acc + l.reassignedTickets, 0);
      const totEstHrs = reportingLeads.reduce((acc, l) => acc + l.estHrsCompleted, 0);
      const totActualHrs = reportingLeads.reduce((acc, l) => acc + l.actualHrsCompleted, 0);
      const efficiency = totActualHrs > 0 ? totEstHrs / totActualHrs : 1.0;

      managerResults.set(s.name, {
        staffId: s.staffId,
        name: s.name,
        department: s.department,
        role: 'Manager',
        reportingTo: null,
        kpiBasis: 'Average of TLs',
        availableDays: settings.workingDays - s.leaveDays,
        targetWeightage: targetUsed,
        ownTargetWeightage: ownTarget,
        assignedWeightage: Number(avgAssigned.toFixed(2)),
        weightageDeducted: Number(avgDeducted.toFixed(4)),
        achievedWeightageNet: Number(avgAchieved.toFixed(4)),
        achievementPercent: achievement,
        achievementDisplay: `${(achievement * 100).toFixed(1)}%`,
        ticketsAssigned: totAssigned,
        ticketsCompleted: totCompleted,
        reassignedTickets: totReassigned,
        estHrsCompleted: totEstHrs,
        actualHrsCompleted: totActualHrs,
        efficiencyPercent: efficiency,
        efficiencyDisplay: `${(efficiency * 100).toFixed(1)}%`,
        rating: getRating(achievement),
      });
    }
  }

  // Combine results in original order
  const staffKpis: StaffKpiResult[] = staffList.map((s) => {
    if (s.role === 'Designer') return designerResults.get(s.name)!;
    if (s.role === 'Team Lead') return leadResults.get(s.name)!;
    return managerResults.get(s.name)!;
  });

  // Calculate Team Total (Designer delivery; counted once)
  const designers = Array.from(designerResults.values());
  const totalTarget = designers.length * standardDesignerTarget; // 9 * 158 = 1422
  const totalAssigned = designers.reduce((acc, d) => acc + d.assignedWeightage, 0); // 725
  const totalDeducted = designers.reduce((acc, d) => acc + d.weightageDeducted, 0); // 15.7
  const totalAchievedNet = designers.reduce((acc, d) => acc + d.achievedWeightageNet, 0); // 709.3
  const totalAchievement = totalTarget > 0 ? totalAchievedNet / totalTarget : 0;

  const totalTicketsAssigned = designers.reduce((acc, d) => acc + d.ticketsAssigned, 0); // 31
  const totalTicketsCompleted = designers.reduce((acc, d) => acc + d.ticketsCompleted, 0); // 31
  const totalReassigned = designers.reduce((acc, d) => acc + d.reassignedTickets, 0); // 3
  const totalEstHrs = designers.reduce((acc, d) => acc + d.estHrsCompleted, 0); // 725
  const totalActualHrs = designers.reduce((acc, d) => acc + d.actualHrsCompleted, 0); // 652
  const totalEfficiency = totalActualHrs > 0 ? totalEstHrs / totalActualHrs : 1.0; // 1.112 (111.2%)

  const teamTotal: StaffKpiResult = {
    staffId: 'TEAM',
    name: 'TEAM TOTAL',
    department: 'Requirement',
    role: 'Designer',
    kpiBasis: 'Own work',
    availableDays: settings.workingDays,
    targetWeightage: totalTarget,
    ownTargetWeightage: totalTarget,
    assignedWeightage: totalAssigned,
    weightageDeducted: Number(totalDeducted.toFixed(2)),
    achievedWeightageNet: Number(totalAchievedNet.toFixed(2)),
    achievementPercent: totalAchievement,
    achievementDisplay: `${(totalAchievement * 100).toFixed(1)}%`,
    ticketsAssigned: totalTicketsAssigned,
    ticketsCompleted: totalTicketsCompleted,
    reassignedTickets: totalReassigned,
    estHrsCompleted: totalEstHrs,
    actualHrsCompleted: totalActualHrs,
    efficiencyPercent: totalEfficiency,
    efficiencyDisplay: `${(totalEfficiency * 100).toFixed(1)}%`,
    rating: getRating(totalAchievement),
  };

  return { staffKpis, teamTotal };
}

// ============================================================================
// Backward compatibility functions for individual scorecards and legacy tests
// ============================================================================

export const DEFAULT_KPI_CONFIG = {
  dailyHours: 8,
  productivityFactor: 0.9,
  capacityFactors: {
    member: 1.0,
    lead: 0.9,
    manager: 0.8,
  },
  aggregationMethod: 'weighted' as const,
};

export interface IndividualKpiInput {
  baseWorkingDays: number;
  approvedLeaveDays: number;
  role: 'member' | 'lead' | 'manager';
  assignedWeightageHours: number;
  completedWeightageHours: number;
  actualLoggedHours: number;
  targetOverrideHours?: number | null;
  deductionHours?: number;
  deductionPercent?: number;
}

export function calculateIndividualKpi(
  input: IndividualKpiInput,
  config = DEFAULT_KPI_CONFIG
) {
  const availableWorkingDays = Math.max(0, input.baseWorkingDays - input.approvedLeaveDays);
  const capFactor = config.capacityFactors[input.role] ?? 1.0;

  const calculatedTargetHours = Number(
    (availableWorkingDays * config.dailyHours * config.productivityFactor * capFactor).toFixed(1)
  );

  const isOverridden =
    typeof input.targetOverrideHours === 'number' && input.targetOverrideHours > 0;
  const effectiveTargetHours = isOverridden
    ? Number(input.targetOverrideHours!.toFixed(1))
    : calculatedTargetHours;

  let netAchieved = input.completedWeightageHours;
  if (input.deductionHours) {
    netAchieved -= input.deductionHours;
  }
  if (input.deductionPercent) {
    netAchieved -= (input.completedWeightageHours * input.deductionPercent) / 100;
  }
  netAchieved = Math.max(0, Number(netAchieved.toFixed(1)));

  const capacityUtilization =
    effectiveTargetHours > 0
      ? Number(((netAchieved / effectiveTargetHours) * 100).toFixed(1))
      : null;

  const deliveryCompletion =
    input.assignedWeightageHours > 0
      ? Number(((netAchieved / input.assignedWeightageHours) * 100).toFixed(1))
      : null;

  const efficiency =
    input.actualLoggedHours > 0
      ? Number(((input.completedWeightageHours / input.actualLoggedHours) * 100).toFixed(1))
      : null;

  const finalScore = capacityUtilization ?? 0;

  let finalBand = 'Needs Improvement';
  if (finalScore >= 100) finalBand = 'Excellent';
  else if (finalScore >= 80) finalBand = 'Good';
  else if (finalScore >= 60) finalBand = 'Average';

  return {
    availableWorkingDays,
    calculatedTargetHours,
    effectiveTargetHours,
    isOverridden,
    netAchievedWeightageHours: netAchieved,
    capacityUtilization,
    deliveryCompletion,
    efficiency,
    finalScore,
    finalBand,
  };
}

export function aggregateTeamKpi(
  memberScores: { score: number; targetHours: number }[],
  method: 'weighted' | 'equal' = 'weighted'
) {
  if (memberScores.length === 0) return { score: 0, band: 'Needs Improvement' };

  let totalScore = 0;
  if (method === 'weighted') {
    const totalTarget = memberScores.reduce((acc, m) => acc + m.targetHours, 0);
    if (totalTarget === 0) return { score: 0, band: 'Needs Improvement' };
    totalScore = memberScores.reduce((acc, m) => acc + (m.score * m.targetHours) / totalTarget, 0);
  } else {
    totalScore = memberScores.reduce((acc, m) => acc + m.score, 0) / memberScores.length;
  }

  const finalScore = Number(totalScore.toFixed(1));
  let band = 'Needs Improvement';
  if (finalScore >= 100) band = 'Excellent';
  else if (finalScore >= 80) band = 'Good';
  else if (finalScore >= 60) band = 'Average';

  return { score: finalScore, band };
}
