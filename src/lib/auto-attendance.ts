import prisma from '@/lib/prisma';

export interface AutoAttendanceParams {
  organizationId: string;
  workDate: string;
  orgSettings?: any;
}

/**
 * Automatically creates check-in & check-out records for scheduled staff
 * on working days according to organization policy, while excluding approved
 * planned leave days and public holidays when configured.
 */
export async function processAutoAttendance({
  organizationId,
  workDate,
  orgSettings,
}: AutoAttendanceParams): Promise<{ count: number; skippedLeaves: number }> {
  try {
    const org =
      orgSettings ||
      (await prisma.organization.findUnique({
        where: { id: organizationId },
      }));

    if (!org) return { count: 0, skippedLeaves: 0 };

    // 1. Policy checks: tracking must be enabled and auto check-in/out must be toggled on
    if (!org.attendanceTrackingEnabled || !org.autoCheckInOutEnabled) {
      return { count: 0, skippedLeaves: 0 };
    }

    // 2. Working days evaluation
    const [year, month, day] = workDate.split('-').map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const currentDayName = dayNames[dateObj.getUTCDay()];

    const configuredDays = (org.workDays || 'Mon,Tue,Wed,Thu,Fri')
      .split(',')
      .map((d: string) => d.trim().toLowerCase());

    if (!configuredDays.includes(currentDayName.toLowerCase())) {
      // Non-working day (e.g. weekend)
      return { count: 0, skippedLeaves: 0 };
    }

    // 3. Exclude public holidays if exclude leaves policy is active
    if (org.autoCheckInOutExcludeLeaves) {
      const holiday = await prisma.holiday.findFirst({
        where: {
          organizationId,
          holidayDate: workDate,
        },
      });
      if (holiday) {
        return { count: 0, skippedLeaves: 0 };
      }
    }

    // 4. Shift timings & net working duration (shift - break)
    const startTime = org.workHoursStart || '09:00';
    const endTime = org.workHoursEnd || '18:00';
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    let shiftDuration = (eH * 60 + eM) - (sH * 60 + sM);
    if (shiftDuration <= 0) shiftDuration = 540; // fallback to standard 9h / 540m
    const breakMins = org.breakDurationMinutes !== undefined ? Number(org.breakDurationMinutes) : 60;
    const netWorkingDuration = Math.max(0, shiftDuration - breakMins);

    // 5. Query active members with existing sessions and approved leave requests
    const members = await prisma.organizationMembership.findMany({
      where: {
        organizationId,
        employmentStatus: 'Active',
      },
      include: {
        attendanceSessions: {
          where: { workDate },
        },
        leaveRequests: org.autoCheckInOutExcludeLeaves
          ? {
              where: {
                status: 'Approved',
                startDate: { lte: workDate },
                endDate: { gte: workDate },
              },
            }
          : false,
      },
    });

    const membersToAutoCheckIn: string[] = [];
    let skippedLeavesCount = 0;

    for (const member of members) {
      // If member already has an attendance session for this date
      if (member.attendanceSessions && member.attendanceSessions.length > 0) {
        // If there's an open session without checkout, close it with standard checkout time
        const openSession = member.attendanceSessions.find((s) => !s.checkOutTime);
        if (openSession) {
          const [inH, inM] = openSession.checkInTime.split(':').map(Number);
          let sessionDuration = (eH * 60 + eM) - (inH * 60 + inM);
          if (sessionDuration < 0) sessionDuration += 24 * 60;
          await prisma.attendanceSession.update({
            where: { id: openSession.id },
            data: {
              checkOutTime: endTime,
              totalMinutes: sessionDuration > 0 ? Math.max(0, sessionDuration - breakMins) : netWorkingDuration,
            },
          });
        }
        continue;
      }

      // If exclude leaves is enabled and member has an approved leave request
      if (org.autoCheckInOutExcludeLeaves && member.leaveRequests && member.leaveRequests.length > 0) {
        skippedLeavesCount++;
        continue;
      }

      membersToAutoCheckIn.push(member.id);
    }

    if (membersToAutoCheckIn.length > 0) {
      await prisma.attendanceSession.createMany({
        data: membersToAutoCheckIn.map((membershipId) => ({
          membershipId,
          workDate,
          checkInTime: startTime,
          checkOutTime: endTime,
          totalMinutes: netWorkingDuration,
          status: 'Present',
          isManual: false,
        })),
        skipDuplicates: true,
      });
    }

    return {
      count: membersToAutoCheckIn.length,
      skippedLeaves: skippedLeavesCount,
    };
  } catch (err) {
    console.error('Error executing auto attendance policy:', err);
    return { count: 0, skippedLeaves: 0 };
  }
}
