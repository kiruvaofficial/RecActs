export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  try {
    const { searchParams } = new URL(req.url);
    const viewKey = searchParams.get('view');

    if (viewKey) {
      const records = await prisma.$queryRaw<Array<{ filters: any }>>`
        SELECT "filters" FROM "UserFilterPreference"
        WHERE "userId" = ${context.user.id} AND "viewKey" = ${viewKey}
        LIMIT 1
      `;
      const filters = records && records.length > 0 ? records[0].filters : null;
      return NextResponse.json({ viewKey, filters });
    }

    const allRecords = await prisma.$queryRaw<Array<{ viewKey: string; filters: any }>>`
      SELECT "viewKey", "filters" FROM "UserFilterPreference"
      WHERE "userId" = ${context.user.id}
    `;

    const preferences: Record<string, any> = {};
    for (const r of allRecords) {
      preferences[r.viewKey] = r.filters;
    }

    return NextResponse.json({ preferences });
  } catch (err: any) {
    console.error('Error fetching user filter preferences:', err);
    return NextResponse.json({ error: 'Failed to fetch filters' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  try {
    const body = await req.json();
    const { viewKey, filters } = body;

    if (!viewKey || typeof filters !== 'object') {
      return NextResponse.json({ error: 'viewKey and filters object are required' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const filtersJson = JSON.stringify(filters);

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO "UserFilterPreference" ("id", "userId", "viewKey", "filters", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4::jsonb, NOW(), NOW())
      ON CONFLICT ("userId", "viewKey")
      DO UPDATE SET "filters" = $4::jsonb, "updatedAt" = NOW()
      `,
      id,
      context.user.id,
      viewKey,
      filtersJson
    );

    return NextResponse.json({ success: true, viewKey, filters });
  } catch (err: any) {
    console.error('Error saving user filter preferences:', err);
    return NextResponse.json({ error: 'Failed to save filters' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  try {
    const { searchParams } = new URL(req.url);
    const viewKey = searchParams.get('view');

    if (viewKey) {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "UserFilterPreference" WHERE "userId" = $1 AND "viewKey" = $2`,
        context.user.id,
        viewKey
      );
    } else {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "UserFilterPreference" WHERE "userId" = $1`,
        context.user.id
      );
    }

    return NextResponse.json({ success: true, message: 'Filters reset successfully' });
  } catch (err: any) {
    console.error('Error deleting user filter preferences:', err);
    return NextResponse.json({ error: 'Failed to delete filters' }, { status: 500 });
  }
}
