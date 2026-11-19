export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';
import { requireTenantContext } from '@/lib/tenant';
import { logAuditEvent } from '@/lib/audit';
import { invalidateBootstrapCache } from '@/lib/bootstrap';
import { KNOWN_ZOHO_DESIGNERS } from '@/lib/zoho-designer-resolver';

const ALLOWED_ROLES = ['lead', 'manager', 'hr', 'owner', 'god'];
const SCHEMA_STORE_PATH = path.resolve(process.cwd(), '.zoho-custom-fields-schema.json');

function getZohoDesignerFieldData(designerParamName: string = 'UDF_MULTIPKL10') {
  let designerOptions: Array<{ id: string; name: string }> = Object.entries(KNOWN_ZOHO_DESIGNERS).map(
    ([id, name]) => ({ id, name })
  );
  let availableFields: Array<{ paramName: string; fieldName: string; fieldTypeName: string }> = [];

  try {
    if (fs.existsSync(SCHEMA_STORE_PATH)) {
      const data = JSON.parse(fs.readFileSync(SCHEMA_STORE_PATH, 'utf8'));
      if (Array.isArray(data)) {
        availableFields = data.map((f: any) => ({
          paramName: f.paramName,
          fieldName: f.fieldName,
          fieldTypeName: f.fieldTypeName,
        }));

        const matchedField = data.find((f: any) => f.paramName === designerParamName || f.fieldName?.toLowerCase() === 'designer');
        if (matchedField && Array.isArray(matchedField.options) && matchedField.options.length > 0) {
          designerOptions = matchedField.options;
        }
      }
    }
  } catch (e) {
    console.warn('Could not read .zoho-custom-fields-schema.json for designer options:', e);
  }

  return { designerOptions, availableFields };
}

export async function GET(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  const currentRole = context.role;
  if (!ALLOWED_ROLES.includes(currentRole)) {
    return NextResponse.json(
      { error: 'Forbidden. Managing users requires Team Lead, Manager, HR, or Owner privileges.' },
      { status: 403 }
    );
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { id: context.organizationId },
      select: { id: true, name: true, zohoDesignerField: true },
    });

    const activeDesignerField = org?.zohoDesignerField || 'UDF_MULTIPKL10';
    const { designerOptions, availableFields } = getZohoDesignerFieldData(activeDesignerField);

    const [memberships, teams, roles] = await Promise.all([
      prisma.organizationMembership.findMany({
        where: { organizationId: context.organizationId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              initials: true,
              phone: true,
              avatarUrl: true,
            },
          },
          team: {
            select: { id: true, name: true },
          },
          roles: {
            include: { role: true },
          },
        },
        orderBy: { user: { name: 'asc' } },
      }),
      prisma.team.findMany({
        where: { organizationId: context.organizationId },
        orderBy: { name: 'asc' },
      }),
      prisma.role.findMany({
        where: {
          OR: [{ organizationId: context.organizationId }, { isSystem: true }],
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    // Map helper references for reporting leads and managers
    const memberNameMap = new Map<string, string>();
    memberships.forEach((m) => {
      memberNameMap.set(m.id, m.user.name);
    });

    const formattedUsers = memberships.map((m) => {
      const primaryRole = m.roles[0]?.role?.name || m.designation || 'Team Member';
      return {
        id: m.id,
        membershipId: m.id,
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        initials: m.user.initials,
        phone: m.user.phone || '—',
        avatarUrl: m.user.avatarUrl,
        designation: m.designation,
        teamId: m.teamId,
        teamName: m.team?.name || 'Unassigned',
        role: primaryRole,
        roles: m.roles.map((r) => r.role.name),
        reportingLeadId: m.reportingLeadId,
        reportingLeadName: m.reportingLeadId ? memberNameMap.get(m.reportingLeadId) || 'Lead' : 'None',
        reportingManagerId: m.reportingManagerId,
        reportingManagerName: m.reportingManagerId ? memberNameMap.get(m.reportingManagerId) || 'Manager' : 'None',
        employmentStatus: m.employmentStatus || 'Active',
        joiningDate: m.joiningDate,
        capacityFactorOverride: m.capacityFactorOverride,
        experienceLevel: (m as any).experienceLevel || 'Mid',
        zohoDesignerName: m.zohoDesignerName || null,
      };
    });

    // Potential leads and managers for dropdowns
    const leads = formattedUsers.filter(
      (u) =>
        u.role.toLowerCase().includes('lead') ||
        u.designation.toLowerCase().includes('lead') ||
        u.role.toLowerCase().includes('manager') ||
        u.role.toLowerCase().includes('owner')
    );

    const managers = formattedUsers.filter(
      (u) =>
        u.role.toLowerCase().includes('manager') ||
        u.designation.toLowerCase().includes('manager') ||
        u.role.toLowerCase().includes('director') ||
        u.role.toLowerCase().includes('owner')
    );

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      teams,
      roles,
      leads,
      managers,
      zohoDesignerField: activeDesignerField,
      zohoDesignerOptions: designerOptions,
      availableCustomFields: availableFields,
    });
  } catch (err: any) {
    console.error('Error fetching users in /api/users:', err);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: err?.message || String(err) },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  const currentRole = context.role;
  if (!ALLOWED_ROLES.includes(currentRole)) {
    return NextResponse.json(
      { error: 'Forbidden. Updating users requires Team Lead, Manager, HR, or Owner privileges.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const {
      membershipId,
      name,
      email,
      designation,
      teamId,
      reportingLeadId,
      reportingManagerId,
      employmentStatus,
      joiningDate,
      capacityFactorOverride,
      experienceLevel,
      zohoDesignerName,
      zohoDesignerField,
      roleName,
    } = body;

    // 1. If updating global Zoho Designer Field setting
    if (zohoDesignerField && typeof zohoDesignerField === 'string') {
      await prisma.organization.update({
        where: { id: context.organizationId },
        data: { zohoDesignerField: zohoDesignerField.trim() },
      });
    }

    if (!membershipId) {
      if (zohoDesignerField) {
        invalidateBootstrapCache(context.organizationId);
        return NextResponse.json({
          success: true,
          message: `Updated Zoho Sprints Designer field to ${zohoDesignerField}`,
          zohoDesignerField,
        });
      }
      return NextResponse.json({ error: 'membershipId is required' }, { status: 400 });
    }

    const existingMember = await prisma.organizationMembership.findFirst({
      where: { id: membershipId, organizationId: context.organizationId },
      include: { user: true },
    });

    if (!existingMember) {
      return NextResponse.json({ error: 'User membership not found' }, { status: 404 });
    }

    // Update user personal details if changed
    if (name || email) {
      const updateUserData: any = {};
      if (name && name.trim()) {
        updateUserData.name = name.trim();
        updateUserData.initials = name
          .trim()
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 3);
      }
      if (email && email.trim()) {
        updateUserData.email = email.trim().toLowerCase();
      }

      await prisma.user.update({
        where: { id: existingMember.userId },
        data: updateUserData,
      });
    }

    // Update organization membership details
    const updatedMember = await prisma.organizationMembership.update({
      where: { id: membershipId },
      data: {
        designation: designation !== undefined ? designation : existingMember.designation,
        teamId: teamId !== undefined ? (teamId === 'none' ? null : teamId) : existingMember.teamId,
        reportingLeadId:
          reportingLeadId !== undefined
            ? reportingLeadId === 'none'
              ? null
              : reportingLeadId
            : existingMember.reportingLeadId,
        reportingManagerId:
          reportingManagerId !== undefined
            ? reportingManagerId === 'none'
              ? null
              : reportingManagerId
            : existingMember.reportingManagerId,
        employmentStatus: employmentStatus || existingMember.employmentStatus,
        joiningDate: joiningDate || existingMember.joiningDate,
        capacityFactorOverride:
          capacityFactorOverride !== undefined
            ? capacityFactorOverride === null || capacityFactorOverride === ''
              ? null
              : Number(capacityFactorOverride)
            : existingMember.capacityFactorOverride,
        experienceLevel:
          experienceLevel !== undefined
            ? experienceLevel
            : (existingMember as any).experienceLevel || 'Mid',
        zohoDesignerName:
          zohoDesignerName !== undefined
            ? zohoDesignerName === 'none' || !zohoDesignerName
              ? null
              : zohoDesignerName.trim()
            : existingMember.zohoDesignerName,
      },
      include: {
        user: true,
        team: true,
      },
    });

    // Update role if requested
    if (roleName) {
      const targetRole = await prisma.role.findFirst({
        where: {
          name: { equals: roleName, mode: 'insensitive' },
          OR: [{ organizationId: context.organizationId }, { isSystem: true }],
        },
      });

      if (targetRole) {
        // Delete existing roles and assign new one
        await prisma.membershipRole.deleteMany({
          where: { membershipId: existingMember.id },
        });
        await prisma.membershipRole.create({
          data: {
            membershipId: existingMember.id,
            roleId: targetRole.id,
          },
        });
      }
    }

    await logAuditEvent({
      organizationId: context.organizationId,
      actorUserId: context.userId,
      actorName: context.user.name,
      module: 'Settings',
      action: 'USER_UPDATED',
      details: `Updated member details for ${updatedMember.user.name} (${updatedMember.designation}) - Zoho Designer: ${updatedMember.zohoDesignerName || 'Unmapped'}`,
    });

    invalidateBootstrapCache(context.organizationId);

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updatedMember.user.name}`,
      user: updatedMember,
    });
  } catch (err: any) {
    console.error('Error updating user in /api/users:', err);
    return NextResponse.json(
      { error: 'Failed to update user', details: err?.message || String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { error, context } = await requireTenantContext();
  if (error || !context) return error;

  const currentRole = context.role;
  if (!ALLOWED_ROLES.includes(currentRole)) {
    return NextResponse.json(
      { error: 'Forbidden. Adding users requires Team Lead, Manager, HR, or Owner privileges.' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const {
      name,
      email,
      designation = 'Designer',
      teamId,
      roleName = 'Team Member',
      reportingLeadId,
      reportingManagerId,
      employmentStatus = 'Active',
      joiningDate = new Date().toISOString().substring(0, 10),
      capacityFactorOverride,
      experienceLevel = 'Mid',
      zohoDesignerName,
    } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const initials = cleanName
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 3);

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          name: cleanName,
          initials,
          passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890dummyhashfornow',
        },
      });
    }

    // Check if membership already exists in this org
    let membership = await prisma.organizationMembership.findFirst({
      where: { userId: user.id, organizationId: context.organizationId },
    });

    if (membership) {
      return NextResponse.json(
        { error: `User ${cleanEmail} is already a member of this organization.` },
        { status: 400 }
      );
    }

    membership = await prisma.organizationMembership.create({
      data: {
        organizationId: context.organizationId,
        userId: user.id,
        designation,
        teamId: teamId && teamId !== 'none' ? teamId : null,
        reportingLeadId: reportingLeadId && reportingLeadId !== 'none' ? reportingLeadId : null,
        reportingManagerId: reportingManagerId && reportingManagerId !== 'none' ? reportingManagerId : null,
        employmentStatus,
        joiningDate,
        capacityFactorOverride: capacityFactorOverride ? Number(capacityFactorOverride) : null,
        experienceLevel: experienceLevel || 'Mid',
        zohoDesignerName: zohoDesignerName && zohoDesignerName !== 'none' ? zohoDesignerName.trim() : null,
      },
      include: {
        user: true,
        team: true,
      },
    });

    // Assign Role
    const targetRole = await prisma.role.findFirst({
      where: {
        name: { equals: roleName, mode: 'insensitive' },
        OR: [{ organizationId: context.organizationId }, { isSystem: true }],
      },
    });

    if (targetRole) {
      await prisma.membershipRole.create({
        data: {
          membershipId: membership.id,
          roleId: targetRole.id,
        },
      });
    }

    await logAuditEvent({
      organizationId: context.organizationId,
      actorUserId: context.userId,
      actorName: context.user.name,
      module: 'Settings',
      action: 'USER_CREATED',
      details: `Added new member ${cleanName} (${designation}) with Zoho Designer mapping: ${zohoDesignerName || 'None'}`,
    });

    invalidateBootstrapCache(context.organizationId);

    return NextResponse.json({
      success: true,
      message: `Successfully added ${cleanName} to team`,
      user: membership,
    });
  } catch (err: any) {
    console.error('Error creating user in /api/users:', err);
    return NextResponse.json(
      { error: 'Failed to create user', details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
