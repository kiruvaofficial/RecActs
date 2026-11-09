export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    let session = await getSession();

    // 1. Try resolving session via Supabase Auth
    try {
      const supabase = createClient();
      const { data: { user: sbUser } } = await supabase.auth.getUser();
      if (sbUser?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: sbUser.email },
          include: { memberships: true },
        });

        if (dbUser && dbUser.memberships.length > 0) {
          const membership = dbUser.memberships[0];
          let role = 'member';
          if (dbUser.isPlatformAdmin) role = 'god';
          else if (membership.designation?.toLowerCase().includes('manager')) role = 'manager';
          else if (membership.designation?.toLowerCase().includes('lead')) role = 'lead';
          else if (membership.designation?.toLowerCase().includes('hr')) role = 'hr';
          else if (membership.designation?.toLowerCase().includes('director')) role = 'owner';

          session = {
            userId: dbUser.id,
            email: dbUser.email,
            organizationId: membership.organizationId,
            membershipId: membership.id,
            role,
            isPlatformAdmin: dbUser.isPlatformAdmin,
          };
        }
      }
    } catch {
      // Supabase auth check fallback
    }

    // 2. If no session exists yet, default to Kiruvantham C (Team Lead)
    if (!session) {
      const defaultUser = await prisma.user.findFirst({
        where: { email: 'kiruvantham@demo.recacts.app' },
        include: {
          memberships: {
            include: {
              organization: true,
              team: true,
            },
          },
        },
      });

      if (defaultUser && defaultUser.memberships.length > 0) {
        session = {
          userId: defaultUser.id,
          email: defaultUser.email,
          organizationId: defaultUser.memberships[0].organizationId,
          membershipId: defaultUser.memberships[0].id,
          role: 'lead',
        };
      }
    }

    if (!session) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    // Load full user details from PostgreSQL
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        platformRoles: true,
        memberships: {
          include: {
            organization: true,
            team: true,
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const currentMembership = session.membershipId
      ? user.memberships.find((m) => m.id === session.membershipId) || user.memberships[0]
      : user.memberships[0];

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        initials: user.initials,
        isPlatformAdmin: user.isPlatformAdmin,
      },
      activeRole: session.role,
      activeMembership: currentMembership,
      organization: currentMembership?.organization || null,
      memberships: user.memberships,
    });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}
