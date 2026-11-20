export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import {
  RolePermissionConfigData,
  INITIAL_ROLES_CATALOG,
  DEFAULT_ACTIONS,
  READ_ONLY_ACTIONS,
  ALL_ACTIONS,
} from '@/lib/role-permissions';

export async function GET(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  try {
    const rawConfigs = await prisma.$queryRaw<Array<{
      id: string;
      roleKey: string;
      roleName: string;
      description: string | null;
      permissions: any;
      exemptions: any;
    }>>`
      SELECT "id", "roleKey", "roleName", "description", "permissions", "exemptions"
      FROM "RolePermissionConfig"
      WHERE "organizationId" = ${context.organizationId}
    `;

    const savedMap = new Map<string, typeof rawConfigs[0]>();
    for (const row of rawConfigs) {
      savedMap.set(row.roleKey, row);
    }

    const mergedRoles: RolePermissionConfigData[] = INITIAL_ROLES_CATALOG.map((def) => {
      const saved = savedMap.get(def.roleKey);
      if (!saved) return def;
      return {
        ...def,
        id: saved.id,
        roleName: saved.roleName || def.roleName,
        description: saved.description || def.description,
        exemptions: saved.exemptions || def.exemptions,
        directScopes: saved.permissions?.directScopes || def.directScopes,
        modulePermissions: saved.permissions?.modulePermissions || def.modulePermissions,
      };
    });

    // Also include any newly added custom roles
    for (const saved of rawConfigs) {
      if (!INITIAL_ROLES_CATALOG.some((d) => d.roleKey === saved.roleKey)) {
        mergedRoles.push({
          id: saved.id,
          roleKey: saved.roleKey,
          roleName: saved.roleName,
          description: saved.description || 'Custom organization role.',
          badge: 'Custom',
          isDefault: false,
          exemptions: saved.exemptions || { editWindowDays: 4, backdatedLoggingAllowed: false, requireLeadApproval: true },
          directScopes: saved.permissions?.directScopes || {
            withinDepartment: { ...DEFAULT_ACTIONS },
            otherColleagues: { ...READ_ONLY_ACTIONS },
            externalUsers: { ...READ_ONLY_ACTIONS, view: false },
          },
          modulePermissions: saved.permissions?.modulePermissions || {
            teamWork: { ...READ_ONLY_ACTIONS },
            workLogs: { ...DEFAULT_ACTIONS },
            tickets: { ...READ_ONLY_ACTIONS },
            ganttTimeline: { ...READ_ONLY_ACTIONS },
            attendance: { ...DEFAULT_ACTIONS },
            kpiEngine: { ...READ_ONLY_ACTIONS },
            leavePlanner: { ...DEFAULT_ACTIONS },
            blockers: { ...DEFAULT_ACTIONS },
            zohoSync: { ...READ_ONLY_ACTIONS, view: false },
            userManagement: { ...READ_ONLY_ACTIONS, view: false },
          },
        });
      }
    }

    return NextResponse.json({
      roles: mergedRoles,
    });
  } catch (err) {
    console.error('Error fetching role permission configs:', err);
    return NextResponse.json({ error: 'Failed to fetch role permissions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  try {
    const body = await req.json();
    const { roleKey, roleName, description, directScopes, modulePermissions, exemptions } = body;

    if (!roleKey || !directScopes || !modulePermissions) {
      return NextResponse.json({ error: 'roleKey, directScopes and modulePermissions are required' }, { status: 400 });
    }

    const permissionsPayload = {
      directScopes,
      modulePermissions,
    };

    const id = crypto.randomUUID();

    await prisma.$executeRaw`
      INSERT INTO "RolePermissionConfig" (
        "id", "organizationId", "roleKey", "roleName", "description", "permissions", "exemptions", "updatedAt"
      )
      VALUES (
        ${id},
        ${context.organizationId},
        ${roleKey},
        ${roleName || roleKey},
        ${description || null},
        ${permissionsPayload}::jsonb,
        ${exemptions || { editWindowDays: 4 }}::jsonb,
        NOW()
      )
      ON CONFLICT ("organizationId", "roleKey")
      DO UPDATE SET
        "roleName" = EXCLUDED."roleName",
        "description" = EXCLUDED."description",
        "permissions" = EXCLUDED."permissions",
        "exemptions" = EXCLUDED."exemptions",
        "updatedAt" = NOW();
    `;

    return NextResponse.json({
      success: true,
      roleKey,
      message: `Permissions updated successfully for role ${roleName || roleKey}`,
    });
  } catch (err: any) {
    console.error('Error saving role permission config:', err);
    return NextResponse.json({ error: err.message || 'Failed to save role permissions' }, { status: 500 });
  }
}
