import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import { getDiscoveredZohoFields, getAllRawZohoItems, getDiscoveredCustomFields } from '@/lib/zoho-raw-store';
import { getZohoScheduleConfig, saveZohoScheduleConfig } from '@/lib/zoho-schedule';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { error } = await requireTenantContext();
  if (error) return error;

  const url = new URL(req.url);
  const selectedRef = url.searchParams.get('ref');

  const fields = getDiscoveredZohoFields();
  const rawStore = getAllRawZohoItems();
  const schedule = getZohoScheduleConfig();

  const references = Object.keys(rawStore);

  let singleItemPayload = null;
  if (selectedRef && rawStore[selectedRef]) {
    singleItemPayload = rawStore[selectedRef];
  } else if (references.length > 0) {
    singleItemPayload = rawStore[references[0]];
  }

  return NextResponse.json({
    success: true,
    totalItems: references.length,
    references: references.slice(0, 100),
    fields,
    customFieldsSchema: getDiscoveredCustomFields(),
    selectedRef: selectedRef || (references[0] ?? null),
    samplePayload: singleItemPayload,
    schedule,
  });
}

export async function POST(req: NextRequest) {
  const { error } = await requireTenantContext();
  if (error) return error;

  try {
    const body = await req.json();
    const { autoSyncEnabled, intervalMinutes } = body;

    const updated = saveZohoScheduleConfig({
      autoSyncEnabled: typeof autoSyncEnabled === 'boolean' ? autoSyncEnabled : undefined,
      intervalMinutes: typeof intervalMinutes === 'number' ? intervalMinutes : undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Updated sync schedule: ${updated.autoSyncEnabled ? `Every ${updated.intervalMinutes} minutes` : 'Disabled'}`,
      schedule: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed updating sync schedule', details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
