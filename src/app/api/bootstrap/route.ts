export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import { getBootstrapData } from '@/lib/bootstrap';

export async function GET(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  const url = new URL(req.url);
  const period = url.searchParams.get('period') || '2026-10';
  const workDate = url.searchParams.get('date') || '2026-10-31';
  const bypassCache = url.searchParams.get('refresh') === 'true';

  try {
    const data = await getBootstrapData({
      organizationId: context.organizationId,
      membershipId: context.membershipId,
      userId: context.userId,
      role: context.role,
      user: context.user,
      organization: context.organization,
      period,
      workDate,
      bypassCache,
    });

    return NextResponse.json({
      authenticated: true,
      activeRole: context.role,
      activeMembership: context.membership,
      user: {
        id: context.user.id,
        email: context.user.email,
        name: context.user.name,
        initials: context.user.initials,
        isPlatformAdmin: context.user.isPlatformAdmin,
      },
      organization: context.organization,
      ...data,
      settingsData: context.organization,
    });
  } catch (err: any) {
    console.error('Error in /api/bootstrap:', err);
    return NextResponse.json({ error: 'Failed to bootstrap tenant data', details: err.message }, { status: 500 });
  }
}
