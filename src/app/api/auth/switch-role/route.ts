export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSession, signToken } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getBootstrapData } from '@/lib/bootstrap';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const targetRole = body.role;
    const targetMembershipId = body.membershipId;
    const specificUserId = body.userId;

    // Platform Admins can switch to support/god mode or impersonate in tenant support
    if (session.isPlatformAdmin) {
      let targetUser = await prisma.user.findUnique({
        where: { id: specificUserId || session.userId },
        include: {
          memberships: {
            include: { organization: true, team: true },
          },
        },
      });

      if (!targetUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const membership = targetMembershipId
        ? targetUser.memberships.find((m) => m.id === targetMembershipId) || targetUser.memberships[0]
        : targetUser.memberships[0];

      const resolvedRole = targetRole || (targetUser.isPlatformAdmin ? 'god' : 'member');

      const token = signToken({
        userId: targetUser.id,
        email: targetUser.email,
        organizationId: membership?.organizationId,
        membershipId: membership?.id,
        role: resolvedRole,
        isPlatformAdmin: targetUser.isPlatformAdmin,
      });

      let bootstrapData = null;
      if (membership?.organizationId && membership?.id) {
        try {
          bootstrapData = await getBootstrapData({
            organizationId: membership.organizationId,
            membershipId: membership.id,
            userId: targetUser.id,
            role: resolvedRole,
            user: targetUser,
            organization: membership.organization,
            period: '2026-10',
            workDate: '2026-10-31',
          });
        } catch {}
      }

      const response = NextResponse.json({
        success: true,
        activeRole: resolvedRole,
        activeMembership: membership,
        organization: membership?.organization || null,
        user: {
          id: targetUser.id,
          email: targetUser.email,
          name: targetUser.name,
          initials: targetUser.initials,
          isPlatformAdmin: targetUser.isPlatformAdmin,
        },
        bootstrap: bootstrapData,
      });

      response.cookies.set('recacts_session', token, {
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
        sameSite: 'lax',
      });

      return response;
    }

    // Standard Users: Can only switch between their own memberships or authorized roles
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        memberships: {
          include: {
            organization: true,
            team: true,
            roles: { include: { role: true } },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const targetMembership = targetMembershipId
      ? user.memberships.find((m) => m.id === targetMembershipId)
      : user.memberships[0];

    if (!targetMembership) {
      return NextResponse.json({ error: 'Invalid membership for current user' }, { status: 403 });
    }

    // Determine role based on target membership designation
    let resolvedRole = 'member';
    if (targetMembership.designation?.toLowerCase().includes('manager')) resolvedRole = 'manager';
    else if (targetMembership.designation?.toLowerCase().includes('lead')) resolvedRole = 'lead';
    else if (targetMembership.designation?.toLowerCase().includes('hr')) resolvedRole = 'hr';
    else if (targetMembership.designation?.toLowerCase().includes('director')) resolvedRole = 'owner';

    const token = signToken({
      userId: user.id,
      email: user.email,
      organizationId: targetMembership.organizationId,
      membershipId: targetMembership.id,
      role: resolvedRole,
      isPlatformAdmin: user.isPlatformAdmin,
    });

    let bootstrapData = null;
    if (targetMembership.organizationId && targetMembership.id) {
      try {
        bootstrapData = await getBootstrapData({
          organizationId: targetMembership.organizationId,
          membershipId: targetMembership.id,
          userId: user.id,
          role: resolvedRole,
          user,
          organization: targetMembership.organization,
          period: '2026-10',
          workDate: '2026-10-31',
        });
      } catch {}
    }

    const response = NextResponse.json({
      success: true,
      activeRole: resolvedRole,
      activeMembership: targetMembership,
      organization: targetMembership.organization || null,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        initials: user.initials,
        isPlatformAdmin: user.isPlatformAdmin,
      },
      bootstrap: bootstrapData,
    });

    response.cookies.set('recacts_session', token, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
    });

    return response;
  } catch (error) {
    console.error('Error switching role:', error);
    return NextResponse.json({ error: 'Failed to switch role' }, { status: 500 });
  }
}
