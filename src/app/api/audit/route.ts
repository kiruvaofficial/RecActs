import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  try {
    const orgAudit = await prisma.auditLog.findMany({
      where: { organizationId: context.organizationId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    let platformAudit: any[] = [];
    if (context.role === 'god' || context.user.isPlatformAdmin) {
      platformAudit = await prisma.platformAuditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    }

    return NextResponse.json({
      auditLogs: orgAudit,
      platformAuditLogs: platformAudit,
    });
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
