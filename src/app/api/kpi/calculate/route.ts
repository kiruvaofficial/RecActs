export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import prisma from '@/lib/prisma';
import { resolveZohoDesignerValue } from '@/lib/zoho-designer-resolver';
import {
  calculateDepartmentKpi,
  calculateTargetWeightage,
  calculateTicketDeduction,
  calculateDailyWorkingHours,
  DEFAULT_KPI_SETTINGS,
  StaffKpiInput,
  KpiSettings,
} from '@/lib/kpi-engine';

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

export async function GET(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  const url = new URL(req.url);
  const targetMemberId = url.searchParams.get('memberId') || context.membershipId;
  const period = url.searchParams.get('period') || '2026-11';

  try {
    const org = await prisma.organization.findUnique({
      where: { id: context.organizationId },
    });

    const { shiftHours, breakHours, dailyWorkingHours } = calculateDailyWorkingHours(
      org?.workHoursStart || '09:00',
      org?.workHoursEnd || '18:00',
      org?.breakDurationMinutes ?? 60
    );

    const settings: KpiSettings = {
      workingDays: 22,
      dailyHours: dailyWorkingHours,
      productiveFactor: (org?.productivityFactor || 90) / 100,
      capacityMember: (org?.capacityFactorMember || 100) / 100,
      capacityLead: 0.6, // 60% for Team Leads (as in updated KPI rules)
      capacityManager: 0.6,
      deduction1Reassign: 0.05,
      deduction2Reassign: 0.10,
      deduction3Reassign: 0.15, // 15% for 3+ reassignments
      experienceJunior: 0.8,
      experienceMid: 1.0,
      experienceSenior: 1.5,
    };

    // Helper to test if ticket is completed
    const isCompletedStatus = (ticket: any): boolean => {
      const s = String(
        (ticket.rawPayload as any)?.statusName ||
        (ticket.rawPayload as any)?.status_name ||
        ticket.status ||
        ''
      ).toLowerCase().trim();
      return s.includes('completed') || s.includes('done') || s.includes('closed') || s.includes('live');
    };

    // Fetch all members in organization with their tickets, assignments, leaves
    const members = await prisma.organizationMembership.findMany({
      where: {
        organizationId: context.organizationId,
        employmentStatus: { not: 'Terminated' },
      },
      include: {
        user: true,
        team: true,
        ticketAssignments: {
          include: {
            ticket: true,
          },
        },
        leaveRequests: {
          where: {
            status: 'Approved',
            startDate: { startsWith: period },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Build member lookup map for hierarchy resolution
    const memberNameMap: Record<string, string> = {};
    for (const m of members) {
      memberNameMap[m.id] = m.user.name;
    }

    // Fetch all tickets for organization for audit and delivery list
    const allOrgTickets = await prisma.ticket.findMany({
      where: { organizationId: context.organizationId },
      include: {
        assignments: {
          include: {
            membership: {
              include: { user: true },
            },
          },
        },
      },
      orderBy: { reference: 'asc' },
    });

    // Filter target delivery members
    const targetMembers = members.filter((m) => m.employmentStatus !== 'Terminated');

    // Build StaffKpiInput records for each member
    const staffInputs: StaffKpiInput[] = targetMembers.map((m) => {
      const name = m.user.name;
      const desig = m.designation.toLowerCase();

      let role = 'Designer';
      let capacityPercent = settings.capacityMember;

      if (desig.includes('manager')) {
        role = 'Manager';
        capacityPercent = settings.capacityManager;
      } else if (desig.includes('lead')) {
        role = 'Team Lead';
        capacityPercent = settings.capacityLead;
      } else if (desig.includes('tester') || desig.includes('qa')) {
        role = 'Tester';
      } else if (desig.includes('dev')) {
        role = 'Developer';
      }

      if (typeof m.capacityFactorOverride === 'number' && m.capacityFactorOverride > 0) {
        capacityPercent = m.capacityFactorOverride;
      }

      // Experience level resolution (explicit membership setting takes precedence over designation)
      let experienceLevel: 'Junior' | 'Mid' | 'Senior' = 'Mid';
      const configuredLevel = (m as any).experienceLevel;
      if (configuredLevel === 'Senior' || configuredLevel === 'Junior' || configuredLevel === 'Mid') {
        experienceLevel = configuredLevel;
      } else if (desig.includes('senior') || desig.includes('sr') || desig.includes('architect') || desig.includes('principal')) {
        experienceLevel = 'Senior';
      } else if (desig.includes('junior') || desig.includes('jr') || desig.includes('trainee') || desig.includes('intern')) {
        experienceLevel = 'Junior';
      }

      let experienceMultiplier = settings.experienceMid ?? 1.0;
      if (experienceLevel === 'Senior') {
        experienceMultiplier = settings.experienceSenior ?? 1.5;
      } else if (experienceLevel === 'Junior') {
        experienceMultiplier = settings.experienceJunior ?? 0.8;
      }

      const reportingTo =
        (m.reportingLeadId && memberNameMap[m.reportingLeadId]) ||
        (role === 'Team Lead' ? 'Don Michael' : null);

      // Approved leave days
      const leaveDays = m.leaveRequests.reduce((acc, l) => acc + l.totalDays, 0);

      // Gather all tickets assigned to this member
      const directAssignments = m.ticketAssignments || [];
      const designerName = (m.zohoDesignerName || m.user.name).toLowerCase();
      const additionalTickets = allOrgTickets.filter((t) => {
        if (directAssignments.some((da) => da.ticketId === t.id)) return false;
        const rawDes = (t.customFields as any)?.[org?.zohoDesignerField || 'UDF_MULTIPKL10']?.displayValue ||
          (t.customFields as any)?.[org?.zohoDesignerField || 'UDF_MULTIPKL10']?.rawValue ||
          (t.customFields as any)?.UDF_MULTIPKL10?.displayValue ||
          (t.customFields as any)?.UDF_PKL15?.displayValue || '';
        const tDes = resolveZohoDesignerValue(rawDes).toLowerCase();
        return tDes && (tDes === designerName || tDes.includes(designerName.split(' ')[0]));
      });

      const memberTickets = [
        ...directAssignments.map((a) => ({
          ticket: a.ticket,
          est: a.allocatedHours || a.ticket.totalEstimatedHours,
          act: a.loggedHours || a.allocatedHours || a.ticket.totalEstimatedHours,
          reassignCount: a.ticket.reassignmentCount,
          isCompleted: isCompletedStatus(a.ticket),
        })),
        ...additionalTickets.map((t) => ({
          ticket: t,
          est: t.totalEstimatedHours,
          act: t.totalEstimatedHours,
          reassignCount: t.reassignmentCount,
          isCompleted: isCompletedStatus(t),
        })),
      ];

      let assignedWeightage = 0;
      let totalDeduction = 0;
      let achievedWeightageNet = 0;
      let estHrsCompleted = 0;
      let actualHrsCompleted = 0;
      let reassignedTickets = 0;
      let ticketsCompleted = 0;

      for (const item of memberTickets) {
        const est = item.est;
        const act = item.act;
        const reassignCount = item.reassignCount;
        const { deduction, netWeightage } = calculateTicketDeduction(est, reassignCount, settings);

        // Assigned weightage counts ALL assigned tickets (1 weightage = 1 est hr)
        assignedWeightage += est;

        if (reassignCount > 0) {
          reassignedTickets += 1;
        }

        totalDeduction += deduction;

        // Achieved weightage counts ONLY Completed tickets!
        if (item.isCompleted) {
          ticketsCompleted += 1;
          achievedWeightageNet += netWeightage;
          estHrsCompleted += est;
          actualHrsCompleted += act;
        }
      }

      return {
        staffId: m.id,
        name,
        department: m.team?.name || 'Requirement',
        role,
        experienceLevel,
        experienceMultiplier,
        reportingTo,
        leaveDays,
        capacityPercent,
        assignedWeightage: Math.round(assignedWeightage * 10) / 10,
        weightageDeducted: Math.round(totalDeduction * 100) / 100,
        achievedWeightageNet: Math.round(achievedWeightageNet * 100) / 100,
        ticketsAssigned: memberTickets.length,
        ticketsCompleted,
        reassignedTickets,
        estHrsCompleted: Math.round(estHrsCompleted * 10) / 10,
        actualHrsCompleted: Math.round(actualHrsCompleted * 10) / 10,
      };
    });

    // Run updated calculation engine
    const { staffKpis, teamTotal } = calculateDepartmentKpi(staffInputs, settings);

    // Find requested individual or active user
    let individual =
      staffKpis.find((s) => s.staffId === targetMemberId) ||
      staffKpis.find((s) => s.staffId === context.membershipId) ||
      staffKpis[0];

    // Format all tickets for the drilldown table
    const ticketsList = allOrgTickets.map((t) => {
      const primaryAssignee = t.assignments[0];
      const rawDes = (t.customFields as any)?.[org?.zohoDesignerField || 'UDF_MULTIPKL10']?.displayValue ||
        (t.customFields as any)?.[org?.zohoDesignerField || 'UDF_MULTIPKL10']?.rawValue ||
        (t.customFields as any)?.UDF_MULTIPKL10?.displayValue ||
        (t.customFields as any)?.UDF_PKL15?.displayValue;
      const resolvedDes = rawDes ? resolveZohoDesignerValue(rawDes) : null;
      const assigneeName = primaryAssignee?.membership.user.name || resolvedDes || 'Unassigned';
      const est = t.totalEstimatedHours;
      const act = primaryAssignee?.loggedHours || est;
      const reassign = t.reassignmentCount;
      const { deduction, netWeightage, deductionPercent } = calculateTicketDeduction(est, reassign, settings);
      const isCompleted = isCompletedStatus(t);

      return {
        id: t.id,
        reference: t.reference,
        title: t.title,
        customerName: t.customerName,
        assignedTo: assigneeName,
        department: (t.customFields as any)?.UDF_PKL20?.displayValue || 'Requirement',
        estimatedHours: est,
        actualHours: act,
        variance: Number((act - est).toFixed(1)),
        reassignCount: reassign,
        reassignDeductionPercent: deductionPercent,
        weightageDeducted: deduction,
        netWeightage,
        achievedWeightage: isCompleted ? netWeightage : 0,
        status: isCompleted ? 'Completed' : (t.status || 'In Progress'),
      };
    });

    return NextResponse.json({
      period,
      settings: {
        month: formatMonthName(period),
        workingDays: settings.workingDays,
        shiftHours,
        breakHours,
        breakDurationMinutes: org?.breakDurationMinutes ?? 60,
        dailyHours: settings.dailyHours,
        productiveFactor: settings.productiveFactor,
        capacityMember: settings.capacityMember,
        capacityLead: settings.capacityLead,
        capacityManager: settings.capacityManager,
        deduction1Reassign: settings.deduction1Reassign,
        deduction2Reassign: settings.deduction2Reassign,
        deduction3Reassign: settings.deduction3Reassign,
        experienceJunior: settings.experienceJunior,
        experienceMid: settings.experienceMid,
        experienceSenior: settings.experienceSenior,
        formula: `Target = (Working Days - Leave Days) × Daily Hours (${settings.dailyHours}h) × Productive Factor (${Math.round(settings.productiveFactor * 100)}%) × Capacity % × Experience Multiplier (Junior 0.8x, Mid 1.0x, Senior 1.5x)`,
        note: '1 weightage = 1 estimated hour. Net weightage = Weightage x (1 - reassign deduction %). Achieved = sum of Net weightage of Completed tickets.',
      },
      individual,
      staffKpis,
      teamTotal,
      tickets: ticketsList,
    });
  } catch (err: any) {
    console.error('Error calculating department KPI:', err);
    return NextResponse.json(
      { error: 'Failed to calculate department KPI', details: err.message },
      { status: 500 }
    );
  }
}
