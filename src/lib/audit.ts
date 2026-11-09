import prisma from './prisma';

export interface AuditLogInput {
  organizationId: string;
  actorUserId?: string;
  actorMembershipId?: string;
  actorName: string;
  module: 'Approvals' | 'Blockers' | 'Tickets' | 'KPI' | 'Settings' | 'Leave' | 'Attendance' | 'Work Logs' | 'Support';
  action: string;
  details?: string;
}

export async function logAuditEvent(input: AuditLogInput) {
  try {
    return await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId || null,
        actorMembershipId: input.actorMembershipId || null,
        actorName: input.actorName,
        module: input.module,
        action: input.action,
        details: input.details || null,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
    return null;
  }
}

export async function logPlatformAuditEvent(actorName: string, action: string, module: string) {
  try {
    return await prisma.platformAuditLog.create({
      data: {
        actorName,
        action,
        module,
      },
    });
  } catch (err) {
    console.error('Failed to write platform audit log:', err);
    return null;
  }
}
