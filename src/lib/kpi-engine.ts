export interface KpiSettings {
  workingDays: number; // default 22
  dailyHours: number; // default 8
  productiveFactor: number; // default 0.9 (90%)
  capacityMember: number; // default 1.0 (100% -> target 158)
  capacityLead: number; // default 0.6 (60% -> target 95 for TLs)
  capacityManager: number; // default 0.6 (60%)
  deduction1Reassign: number; // default 0.05 (5%)
  deduction2Reassign: number; // default 0.10 (10%)
  deduction3Reassign: number; // default 0.15 (15%)
  experienceJunior: number; // default 0.8 (80% target)
  experienceMid: number; // default 1.0 (100% target)
  experienceSenior: number; // default 1.5 (150% target)
}

export const DEFAULT_KPI_SETTINGS: KpiSettings = {
  workingDays: 22,
  dailyHours: 8,
  productiveFactor: 0.9,
  capacityMember: 1.0,
  capacityLead: 0.6,
  capacityManager: 0.6,
  deduction1Reassign: 0.05,
  deduction2Reassign: 0.10,
  deduction3Reassign: 0.15,
  experienceJunior: 0.8,
  experienceMid: 1.0,
  experienceSenior: 1.5,
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

/**
 * Reassignment Deduction Calculation:
 * - 0 reassignments: 0%
 * - 1 reassignment: 5% (0.05)
 * - 2 reassignments: 10% (0.10)
 * - 3+ reassignments: 15% (0.15)
 */
export function calculateTicketDeduction(
  estHrs: number,
  reassignCount: number,
  settings: KpiSettings = DEFAULT_KPI_SETTINGS
): { deduction: number; netWeightage: number; deductionPercent: number } {
  if (reassignCount <= 0) {
    return { deduction: 0, netWeightage: estHrs, deductionPercent: 0 };
  }
  const rate =
    reassignCount === 1
      ? (settings.deduction1Reassign ?? 0.05)
      : reassignCount === 2
      ? (settings.deduction2Reassign ?? 0.10)
      : (settings.deduction3Reassign ?? 0.15);
  const deduction = Number((estHrs * rate).toFixed(2));
  const netWeightage = Number((estHrs - deduction).toFixed(2));
  return { deduction, netWeightage, deductionPercent: Math.round(rate * 100) };
}

export interface StaffKpiInput {
  staffId: string;
  name: string;
  department: string;
  role: string;
  experienceLevel?: 'Junior' | 'Mid' | 'Senior';
  experienceMultiplier?: number;
  reportingTo?: string | null;
  leaveDays: number;
  capacityPercent: number; // e.g. 1.0, 0.6
  assignedWeightage: number; // Total estimated hours of ALL assigned tickets
  weightageDeducted: number; // Total deductions from reassignments
  achievedWeightageNet: number; // Net weightage of COMPLETED tickets only
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
  role: string;
  experienceLevel: 'Junior' | 'Mid' | 'Senior';
  experienceMultiplier: number;
  reportingTo?: string | null;
  kpiBasis: string;
  availableDays: number;
  targetWeightage: number;
  ownTargetWeightage: number;
  assignedWeightage: number;
  weightageDeducted: number;
  achievedWeightageNet: number;
  achievementPercent: number; // e.g. 1.12 for 112%
  achievementDisplay: string; // e.g. "112.0%"
  ticketsAssigned: number;
  ticketsCompleted: number;
  reassignedTickets: number;
  estHrsCompleted: number;
  actualHrsCompleted: number;
  efficiencyPercent: number; // e.g. 0.984 for 98.4%
  efficiencyDisplay: string;
  rating: KpiRating;
}

/**
 * Calculates Target Weightage based on formula:
 * Target = (Working days - Leave days) * Hours per day * Productive factor * Capacity % * Experience Multiplier
 * Example with 22 days, 8 hrs, 0.9 factor:
 * - Senior (1.5x, 0 leave, 1.0 cap) = round(22 * 8 * 0.9 * 1.0 * 1.5) = 238 hrs
 * - Mid (1.0x, 0 leave, 1.0 cap) = round(22 * 8 * 0.9 * 1.0 * 1.0) = 158 hrs
 * - TL Mid (1.0x, 0 leave, 0.6 cap) = round(22 * 8 * 0.9 * 0.6 * 1.0) = 95 hrs
 * - Mid (1.0x, 1 leave, 1.0 cap) = round(21 * 8 * 0.9 * 1.0 * 1.0) = 151 hrs
 * - Junior (0.8x, 2 leave, 1.0 cap) = round(20 * 8 * 0.9 * 1.0 * 0.8) = 115 hrs
 */
export function calculateTargetWeightage(
  workingDays: number = 22,
  leaveDays: number = 0,
  dailyHours: number = 8,
  productiveFactor: number = 0.9,
  capacityPercent: number = 1.0,
  experienceMultiplier: number = 1.0
): number {
  const availableDays = Math.max(0, workingDays - leaveDays);
  return Math.round(availableDays * dailyHours * productiveFactor * capacityPercent * experienceMultiplier);
}

/**
 * Calculates complete Department KPI table matching the updated Weightage Calculation rules:
 * 1. Target = (Working days - Leave days) x 8 x 0.9 x Capacity % x Experience Multiplier.
 * 2. Assigned Weightage = Sum of estimated hours across all tickets assigned.
 * 3. Net Weightage = Weightage x (1 - reassign deduction %).
 * 4. Achieved Weightage = Sum of net weightage of 'Completed' tickets only.
 * 5. Achievement % = Achieved Weightage (Net) / Target Weightage.
 * 6. Efficiency % = Est. Hrs (Completed) / Actual Hrs (Completed).
 * 7. Rating = Excellent (>= 1.0), Good (>= 0.8), Average (>= 0.6), Needs Improvement (< 0.6).
 */
export function calculateDepartmentKpi(
  staffList: StaffKpiInput[],
  settings: KpiSettings = DEFAULT_KPI_SETTINGS
): {
  staffKpis: StaffKpiResult[];
  teamTotal: StaffKpiResult;
} {
  const staffKpis: StaffKpiResult[] = staffList.map((s) => {
    const expMult = s.experienceMultiplier ?? (
      s.experienceLevel === 'Senior'
        ? (settings.experienceSenior ?? 1.5)
        : s.experienceLevel === 'Junior'
        ? (settings.experienceJunior ?? 0.8)
        : (settings.experienceMid ?? 1.0)
    );

    const expLevel: 'Junior' | 'Mid' | 'Senior' =
      s.experienceLevel || (expMult === 1.5 ? 'Senior' : expMult === 0.8 ? 'Junior' : 'Mid');

    const target = calculateTargetWeightage(
      settings.workingDays,
      s.leaveDays,
      settings.dailyHours,
      settings.productiveFactor,
      s.capacityPercent,
      expMult
    );

    const achievement = target > 0 ? s.achievedWeightageNet / target : 0;
    const efficiency =
      s.actualHrsCompleted > 0 ? s.estHrsCompleted / s.actualHrsCompleted : 1.0;

    return {
      staffId: s.staffId,
      name: s.name,
      department: s.department,
      role: s.role,
      experienceLevel: expLevel,
      experienceMultiplier: expMult,
      reportingTo: s.reportingTo || null,
      kpiBasis: `${expLevel} (${expMult}x)`,
      availableDays: Math.max(0, settings.workingDays - s.leaveDays),
      targetWeightage: target,
      ownTargetWeightage: target,
      assignedWeightage: s.assignedWeightage,
      weightageDeducted: Number(s.weightageDeducted.toFixed(2)),
      achievedWeightageNet: Number(s.achievedWeightageNet.toFixed(2)),
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
    };
  });

  // Calculate Team Total (Aggregate across all team members)
  const totalTarget = staffKpis.reduce((acc, s) => acc + s.targetWeightage, 0);
  const totalAssigned = staffKpis.reduce((acc, s) => acc + s.assignedWeightage, 0);
  const totalDeducted = staffKpis.reduce((acc, s) => acc + s.weightageDeducted, 0);
  const totalAchievedNet = staffKpis.reduce((acc, s) => acc + s.achievedWeightageNet, 0);
  const totalAchievement = totalTarget > 0 ? totalAchievedNet / totalTarget : 0;

  const totalTicketsAssigned = staffKpis.reduce((acc, s) => acc + s.ticketsAssigned, 0);
  const totalTicketsCompleted = staffKpis.reduce((acc, s) => acc + s.ticketsCompleted, 0);
  const totalReassigned = staffKpis.reduce((acc, s) => acc + s.reassignedTickets, 0);
  const totalEstHrs = staffKpis.reduce((acc, s) => acc + s.estHrsCompleted, 0);
  const totalActualHrs = staffKpis.reduce((acc, s) => acc + s.actualHrsCompleted, 0);
  const totalEfficiency = totalActualHrs > 0 ? totalEstHrs / totalActualHrs : 1.0;

  const teamTotal: StaffKpiResult = {
    staffId: 'TEAM',
    name: 'TEAM TOTAL',
    department: staffList[0]?.department || 'Delivery',
    role: 'All Staff',
    experienceLevel: 'Mid',
    experienceMultiplier: 1.0,
    kpiBasis: 'Team Aggregate',
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
