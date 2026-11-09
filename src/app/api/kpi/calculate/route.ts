import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import prisma from '@/lib/prisma';
import {
  calculateDepartmentKpi,
  calculateTargetWeightage,
  calculateTicketDeduction,
  DEFAULT_KPI_SETTINGS,
  StaffKpiInput,
  KpiSettings,
} from '@/lib/kpi-engine';

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

    const settings: KpiSettings = {
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

    // Filter to the Requirement Team staff (Don Michael, Kiruvantham, Rasiga Priya, and the 9 designers)
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

    const targetMembers = members.filter((m) =>
      requirementStaffNames.some((n) => m.user.name.toLowerCase().includes(n.toLowerCase().split(' ')[0]))
    );

    // Build StaffKpiInput records for each member
    const staffInputs: StaffKpiInput[] = targetMembers.map((m) => {
      const name = m.user.name;
      const desig = m.designation.toLowerCase();

      let role: 'Designer' | 'Team Lead' | 'Manager' = 'Designer';
      let capacityPercent = settings.capacityMember;

      if (desig.includes('manager')) {
        role = 'Manager';
        capacityPercent = settings.capacityManager;
      } else if (desig.includes('lead')) {
        role = 'Team Lead';
        capacityPercent = settings.capacityLead;
      }

      const reportingTo =
        (m.reportingLeadId && memberNameMap[m.reportingLeadId]) ||
        (role === 'Team Lead' ? 'Don Michael' : null);

      // Approved leave days
      const leaveDays = m.leaveRequests.reduce((acc, l) => acc + l.totalDays, 0);

      // Ticket assignments
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

        if (reassignCount > 0) {
          reassignedTickets += 1;
        }

        const { deduction } = calculateTicketDeduction(est, reassignCount, settings);
        totalDeduction += deduction;
      }

      const achievedWeightageNet = Number((assignedWeightage - totalDeduction).toFixed(2));

      return {
        staffId: m.id,
        name,
        department: 'Requirement',
        role,
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

    // Run department calculation engine
    const { staffKpis, teamTotal } = calculateDepartmentKpi(staffInputs, settings);

    // Find requested individual or active user
    let individual =
      staffKpis.find((s) => s.staffId === targetMemberId) ||
      staffKpis.find((s) => s.staffId === context.membershipId) ||
      staffKpis[0];

    // Format all tickets for the drilldown table
    const ticketsList = allOrgTickets.map((t) => {
      const primaryAssignee = t.assignments[0];
      const assigneeName = primaryAssignee?.membership.user.name || 'Unassigned';
      const est = t.totalEstimatedHours;
      const act = primaryAssignee?.loggedHours || 0;
      const reassign = t.reassignmentCount;
      const { deduction, netWeightage } = calculateTicketDeduction(est, reassign, settings);

      return {
        id: t.id,
        reference: t.reference,
        title: t.title,
        customerName: t.customerName,
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

    return NextResponse.json({
      period,
      settings: {
        month: 'November 2026',
        workingDays: settings.workingDays,
        dailyHours: settings.dailyHours,
        productiveFactor: settings.productiveFactor,
        capacityMember: settings.capacityMember,
        capacityLead: settings.capacityLead,
        capacityManager: settings.capacityManager,
        deduction1Reassign: settings.deduction1Reassign,
        deduction2Reassign: settings.deduction2Reassign,
        deduction3Reassign: settings.deduction3Reassign,
        formula: 'Target = (Working Days - Leave Days) × Daily Hours (8) × Productive Factor (0.9) × Capacity %',
        note: 'Weightage: TL = average of reporting designers; Manager = equal average of reporting TLs. Counts & hours remain totals. Team Total counts designers once.',
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
