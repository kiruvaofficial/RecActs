import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import {
  KNOWN_ZOHO_PROJECTS,
  getSelectedProjectIds,
  saveSelectedProjectIds,
  fetchZohoProjectsList,
} from '@/lib/zoho-project-config';
import { getActiveZohoAccessToken } from '@/lib/zoho-sprints';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { error } = await requireTenantContext();
  if (error) return error;

  const selectedProjectIds = await getSelectedProjectIds();
  let projects = [...KNOWN_ZOHO_PROJECTS];
  let isConnected = false;

  try {
    const tokenResult = await getActiveZohoAccessToken();
    if (tokenResult?.accessToken) {
      isConnected = true;
      const dynamicList = await fetchZohoProjectsList(
        tokenResult.accessToken,
        tokenResult.portalId,
        tokenResult.region
      );
      if (dynamicList.length > 0) {
        projects = dynamicList;
      }
    }
  } catch (e) {
    // If token not yet active, fallback to KNOWN_ZOHO_PROJECTS
  }

  return NextResponse.json({
    success: true,
    isConnected,
    projects,
    selectedProjectIds,
  });
}

export async function POST(req: NextRequest) {
  const { error } = await requireTenantContext();
  if (error) return error;

  try {
    const body = await req.json();
    const { selectedProjectIds } = body;

    if (!Array.isArray(selectedProjectIds)) {
      return NextResponse.json(
        { error: 'selectedProjectIds must be an array of project ID strings' },
        { status: 400 }
      );
    }

    const saved = await saveSelectedProjectIds(selectedProjectIds);
    return NextResponse.json({
      success: true,
      message: `Updated project sync selection (${saved.length} projects selected)`,
      selectedProjectIds: saved,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed saving project selection', details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
