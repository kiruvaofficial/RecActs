export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/tenant';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export interface ActionPermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  submit: boolean;
  approve: boolean;
  export: boolean;
}

export interface RolePermissionConfigData {
  id?: string;
  roleKey: string;
  roleName: string;
  description: string;
  badge?: string;
  isDefault?: boolean;
  exemptions: {
    editWindowDays: number;
    backdatedLoggingAllowed: boolean;
    requireLeadApproval: boolean;
  };
  directScopes: {
    withinDepartment: ActionPermissions;
    otherColleagues: ActionPermissions;
    externalUsers: ActionPermissions;
  };
  modulePermissions: {
    teamWork: ActionPermissions;
    workLogs: ActionPermissions;
    tickets: ActionPermissions;
    ganttTimeline: ActionPermissions;
    attendance: ActionPermissions;
    kpiEngine: ActionPermissions;
    leavePlanner: ActionPermissions;
    blockers: ActionPermissions;
    zohoSync: ActionPermissions;
    userManagement: ActionPermissions;
  };
}

const DEFAULT_ACTIONS: ActionPermissions = {
  view: true,
  create: true,
  edit: true,
  delete: false,
  submit: true,
  approve: false,
  export: false,
};

const READ_ONLY_ACTIONS: ActionPermissions = {
  view: true,
  create: false,
  edit: false,
  delete: false,
  submit: false,
  approve: false,
  export: false,
};

const ALL_ACTIONS: ActionPermissions = {
  view: true,
  create: true,
  edit: true,
  delete: true,
  submit: true,
  approve: true,
  export: true,
};

export const INITIAL_ROLES_CATALOG: RolePermissionConfigData[] = [
  {
    roleKey: 'admin',
    roleName: 'Admin',
    description: 'Default Role: Full administrative authority across all modules, approvals, and configurations.',
    badge: 'Full Access',
    isDefault: true,
    exemptions: { editWindowDays: 14, backdatedLoggingAllowed: true, requireLeadApproval: false },
    directScopes: {
      withinDepartment: { ...ALL_ACTIONS },
      otherColleagues: { ...ALL_ACTIONS },
      externalUsers: { ...ALL_ACTIONS },
    },
    modulePermissions: {
      teamWork: { ...ALL_ACTIONS },
      workLogs: { ...ALL_ACTIONS },
      tickets: { ...ALL_ACTIONS },
      ganttTimeline: { ...ALL_ACTIONS },
      attendance: { ...ALL_ACTIONS },
      kpiEngine: { ...ALL_ACTIONS },
      leavePlanner: { ...ALL_ACTIONS },
      blockers: { ...ALL_ACTIONS },
      zohoSync: { ...ALL_ACTIONS },
      userManagement: { ...ALL_ACTIONS },
    },
  },
  {
    roleKey: 'member',
    roleName: 'Member',
    description: 'Default Role: Standard staff members who log daily activities, view tickets, and track individual progress.',
    badge: 'Standard',
    isDefault: true,
    exemptions: { editWindowDays: 4, backdatedLoggingAllowed: false, requireLeadApproval: true },
    directScopes: {
      withinDepartment: { view: true, create: true, edit: true, delete: false, submit: true, approve: false, export: false },
      otherColleagues: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      externalUsers: { view: false, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
    },
    modulePermissions: {
      teamWork: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      workLogs: { view: true, create: true, edit: true, delete: false, submit: true, approve: false, export: false },
      tickets: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      ganttTimeline: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      attendance: { view: true, create: true, edit: false, delete: false, submit: true, approve: false, export: false },
      kpiEngine: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      leavePlanner: { view: true, create: true, edit: false, delete: false, submit: true, approve: false, export: false },
      blockers: { view: true, create: true, edit: false, delete: false, submit: true, approve: false, export: false },
      zohoSync: { ...READ_ONLY_ACTIONS, view: false },
      userManagement: { ...READ_ONLY_ACTIONS, view: false },
    },
  },
  {
    roleKey: 'lead',
    roleName: 'Leadership Staff',
    description: 'Team Leads and principal engineers overseeing delivery quality, reviewing timesheets, and mitigating blockers.',
    badge: 'Lead Access',
    isDefault: false,
    exemptions: { editWindowDays: 7, backdatedLoggingAllowed: true, requireLeadApproval: false },
    directScopes: {
      withinDepartment: { view: true, create: true, edit: true, delete: false, submit: true, approve: true, export: true },
      otherColleagues: { view: true, create: true, edit: false, delete: false, submit: false, approve: false, export: false },
      externalUsers: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
    },
    modulePermissions: {
      teamWork: { view: true, create: true, edit: true, delete: false, submit: true, approve: true, export: true },
      workLogs: { view: true, create: true, edit: true, delete: false, submit: true, approve: true, export: true },
      tickets: { view: true, create: true, edit: true, delete: false, submit: true, approve: true, export: true },
      ganttTimeline: { view: true, create: true, edit: true, delete: false, submit: true, approve: false, export: true },
      attendance: { view: true, create: true, edit: true, delete: false, submit: true, approve: true, export: true },
      kpiEngine: { view: true, create: true, edit: true, delete: false, submit: true, approve: false, export: true },
      leavePlanner: { view: true, create: true, edit: true, delete: false, submit: true, approve: true, export: true },
      blockers: { view: true, create: true, edit: true, delete: false, submit: true, approve: true, export: true },
      zohoSync: { view: true, create: true, edit: true, delete: false, submit: false, approve: false, export: true },
      userManagement: { view: true, create: false, edit: true, delete: false, submit: false, approve: false, export: false },
    },
  },
  {
    roleKey: 'manager',
    roleName: 'Organization Managers',
    description: 'Department heads managing cross-functional operations, KPI calibrations, and org-wide resource planning.',
    badge: 'Manager Access',
    isDefault: false,
    exemptions: { editWindowDays: 10, backdatedLoggingAllowed: true, requireLeadApproval: false },
    directScopes: {
      withinDepartment: { ...ALL_ACTIONS, delete: false },
      otherColleagues: { ...ALL_ACTIONS, delete: false },
      externalUsers: { view: true, create: true, edit: false, delete: false, submit: false, approve: false, export: true },
    },
    modulePermissions: {
      teamWork: { ...ALL_ACTIONS, delete: false },
      workLogs: { ...ALL_ACTIONS, delete: false },
      tickets: { ...ALL_ACTIONS, delete: false },
      ganttTimeline: { ...ALL_ACTIONS, delete: false },
      attendance: { ...ALL_ACTIONS, delete: false },
      kpiEngine: { ...ALL_ACTIONS, delete: false },
      leavePlanner: { ...ALL_ACTIONS, delete: false },
      blockers: { ...ALL_ACTIONS, delete: false },
      zohoSync: { ...ALL_ACTIONS, delete: false },
      userManagement: { view: true, create: true, edit: true, delete: false, submit: true, approve: true, export: true },
    },
  },
  {
    roleKey: 'dept_manager',
    roleName: 'Department Managers',
    description: 'Managers dedicated to individual vertical departments with full departmental approval authority.',
    badge: 'Dept Manager',
    isDefault: false,
    exemptions: { editWindowDays: 7, backdatedLoggingAllowed: true, requireLeadApproval: false },
    directScopes: {
      withinDepartment: { ...ALL_ACTIONS, delete: false },
      otherColleagues: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      externalUsers: { view: false, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
    },
    modulePermissions: {
      teamWork: { ...ALL_ACTIONS, delete: false },
      workLogs: { ...ALL_ACTIONS, delete: false },
      tickets: { ...ALL_ACTIONS, delete: false },
      ganttTimeline: { ...ALL_ACTIONS, delete: false },
      attendance: { view: true, create: true, edit: true, delete: false, submit: true, approve: true, export: true },
      kpiEngine: { view: true, create: true, edit: true, delete: false, submit: true, approve: true, export: true },
      leavePlanner: { view: true, create: true, edit: true, delete: false, submit: true, approve: true, export: true },
      blockers: { ...ALL_ACTIONS, delete: false },
      zohoSync: { view: true, create: true, edit: false, delete: false, submit: false, approve: false, export: true },
      userManagement: { view: true, create: false, edit: true, delete: false, submit: false, approve: false, export: false },
    },
  },
  {
    roleKey: 'design_team',
    roleName: 'Design Team',
    description: 'Specialists authoring UI/UX wireframes, requirement specifications, and prototype documentation.',
    badge: 'Design Staff',
    isDefault: false,
    exemptions: { editWindowDays: 4, backdatedLoggingAllowed: false, requireLeadApproval: true },
    directScopes: {
      withinDepartment: { view: true, create: true, edit: true, delete: false, submit: true, approve: false, export: false },
      otherColleagues: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      externalUsers: { view: false, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
    },
    modulePermissions: {
      teamWork: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      workLogs: { view: true, create: true, edit: true, delete: false, submit: true, approve: false, export: false },
      tickets: { view: true, create: false, edit: true, delete: false, submit: false, approve: false, export: false },
      ganttTimeline: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      attendance: { view: true, create: true, edit: false, delete: false, submit: true, approve: false, export: false },
      kpiEngine: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      leavePlanner: { view: true, create: true, edit: false, delete: false, submit: true, approve: false, export: false },
      blockers: { view: true, create: true, edit: false, delete: false, submit: true, approve: false, export: false },
      zohoSync: { ...READ_ONLY_ACTIONS, view: false },
      userManagement: { ...READ_ONLY_ACTIONS, view: false },
    },
  },
  {
    roleKey: 'developers',
    roleName: 'Developers',
    description: 'Engineering personnel implementing features, fixing software bugs, and logging technical effort.',
    badge: 'Engineering',
    isDefault: false,
    exemptions: { editWindowDays: 4, backdatedLoggingAllowed: false, requireLeadApproval: true },
    directScopes: {
      withinDepartment: { view: true, create: true, edit: true, delete: false, submit: true, approve: false, export: false },
      otherColleagues: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      externalUsers: { view: false, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
    },
    modulePermissions: {
      teamWork: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      workLogs: { view: true, create: true, edit: true, delete: false, submit: true, approve: false, export: false },
      tickets: { view: true, create: false, edit: true, delete: false, submit: false, approve: false, export: false },
      ganttTimeline: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      attendance: { view: true, create: true, edit: false, delete: false, submit: true, approve: false, export: false },
      kpiEngine: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      leavePlanner: { view: true, create: true, edit: false, delete: false, submit: true, approve: false, export: false },
      blockers: { view: true, create: true, edit: false, delete: false, submit: true, approve: false, export: false },
      zohoSync: { ...READ_ONLY_ACTIONS, view: false },
      userManagement: { ...READ_ONLY_ACTIONS, view: false },
    },
  },
  {
    roleKey: 'content_writer',
    roleName: 'Content Writer',
    description: 'Authors conducting product research, drafting knowledge base articles, and publishing release guides.',
    badge: 'Content',
    isDefault: false,
    exemptions: { editWindowDays: 3, backdatedLoggingAllowed: false, requireLeadApproval: true },
    directScopes: {
      withinDepartment: { view: true, create: true, edit: true, delete: false, submit: true, approve: false, export: false },
      otherColleagues: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      externalUsers: { view: false, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
    },
    modulePermissions: {
      teamWork: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      workLogs: { view: true, create: true, edit: true, delete: false, submit: true, approve: false, export: false },
      tickets: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      ganttTimeline: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      attendance: { view: true, create: true, edit: false, delete: false, submit: true, approve: false, export: false },
      kpiEngine: { view: true, create: false, edit: false, delete: false, submit: false, approve: false, export: false },
      leavePlanner: { view: true, create: true, edit: false, delete: false, submit: true, approve: false, export: false },
      blockers: { view: true, create: true, edit: false, delete: false, submit: true, approve: false, export: false },
      zohoSync: { ...READ_ONLY_ACTIONS, view: false },
      userManagement: { ...READ_ONLY_ACTIONS, view: false },
    },
  },
];

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
