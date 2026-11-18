export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import { syncZohoTicketsToRecActs, getLastSyncMetadata } from '@/lib/zoho-sprints';

export async function GET() {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  const metadata = getLastSyncMetadata();
  const hasEnvToken = Boolean(
    process.env.ZOHO_REFRESH_TOKEN ||
    process.env.VITE_ZOHO_REFRESH_TOKEN ||
    process.env.ZOHO_CLIENT_ID
  );

  return NextResponse.json({
    hasTokenConfigured: hasEnvToken,
    clientId: process.env.ZOHO_CLIENT_ID || process.env.VITE_ZOHO_CLIENT_ID || '1000.O1OL92CNYEKKMU9P7ABHC4NNR9XJCP',
    portalId: process.env.ZOHO_PORTAL_ID || process.env.VITE_ZOHO_PORTAL_ID || '730202335',
    region: process.env.ZOHO_REGION || 'us',
    lastSync: metadata,
  });
}

export async function POST(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }

    const { customToken, refreshToken, region, portalId, clientId, clientSecret, selectedProjectIds } = body;

    const result = await syncZohoTicketsToRecActs(context.organizationId, {
      config: {
        refreshToken: customToken || refreshToken,
        region,
        portalId,
        clientId,
        clientSecret,
      },
      selectedProjectIds: Array.isArray(selectedProjectIds) && selectedProjectIds.length > 0 ? selectedProjectIds : undefined,
      actorName: context.user.name,
      actorMembershipId: context.membershipId,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to sync tickets from Zoho Sprints',
          details: result.error,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${result.totalSynced} tickets from Zoho Sprints (${result.created} new, ${result.updated} updated)`,
      totalSynced: result.totalSynced,
      created: result.created,
      updated: result.updated,
    });
  } catch (err: any) {
    console.error('Error in /api/tickets/sync-zoho:', err);
    return NextResponse.json(
      { error: 'Internal error during Zoho sync', details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
