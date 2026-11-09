export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSession, signToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

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
        include: { memberships: true },
      });

      if (!targetUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const membership = targetMembershipId
        ? targetUser.memberships.find((m) => m.id === targetMembershipId) || targetUser.memberships[0]
        : targetUser.memberships[0];

      const token = signToken({
        userId: targetUser.id,
        email: targetUser.email,
        organizationId: membership?.organizationId,
        membershipId: membership?.id,
        role: targetRole || (targetUser.isPlatformAdmin ? 'god' : 'member'),
        isPlatformAdmin: targetUser.isPlatformAdmin,
      });

      const response = NextResponse.json({
        success: true,
        activeRole: targetRole || (targetUser.isPlatformAdmin ? 'god' : 'member'),
        user: {
          id: targetUser.id,
          email: targetUser.email,
          name: targetUser.name,
        },
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

    const response = NextResponse.json({
      success: true,
      activeRole: resolvedRole,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
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
