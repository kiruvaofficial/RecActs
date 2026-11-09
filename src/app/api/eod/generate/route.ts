export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import { generateAndSendEodReport } from '@/lib/eod-engine';

export async function POST(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  try {
    const body = await req.json();
    const { workDate, planTomorrow } = body;

    const report = await generateAndSendEodReport({
      organizationId: context.organizationId,
      membershipId: context.membershipId,
      workDate: workDate || '2026-11-09',
      planTomorrow,
    });

    return NextResponse.json({ success: true, report });
  } catch (err) {
    console.error('Error generating EOD report:', err);
    return NextResponse.json({ error: 'Failed to generate EOD report' }, { status: 500 });
  }
}
