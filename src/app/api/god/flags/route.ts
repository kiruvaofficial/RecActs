export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireGodContext } from '@/lib/tenant';
import prisma from '@/lib/prisma';
import { logPlatformAuditEvent } from '@/lib/audit';

export async function GET() {
  const { error, context } = await requireGodContext();
  if (error || !context) return error;

  try {
    const flags = await prisma.featureFlag.findMany({
      orderBy: { key: 'asc' },
    });
    return NextResponse.json({ flags });
  } catch (err) {
    console.error('Error fetching feature flags:', err);
    return NextResponse.json({ error: 'Failed to fetch feature flags' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { error, context } = await requireGodContext();
  if (error || !context) return error;

  try {
    const body = await req.json();
    const { key, isEnabled } = body;

    const flag = await prisma.featureFlag.update({
      where: { key },
      data: { isEnabled: !!isEnabled },
    });

    await logPlatformAuditEvent(
      'Platform Admin',
      `${isEnabled ? 'Enabled' : 'Disabled'} feature flag: ${flag.name}`,
      'Feature Flags'
    );

    return NextResponse.json({ success: true, flag });
  } catch (err) {
    console.error('Error updating feature flag:', err);
    return NextResponse.json({ error: 'Failed to update feature flag' }, { status: 500 });
  }
}
