export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

const ROLE_USER_MAP: Record<string, string> = {
  member: 'yogesh@demo.recacts.app',
  lead: 'kiruvantham@demo.recacts.app',
  manager: 'don.michael@demo.recacts.app',
  hr: 'meena.s@demo.recacts.app',
  owner: 'arun.kumar@demo.recacts.app',
  god: 'admin@recacts.app',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const targetRole = body.role || 'lead';
    const specificUserId = body.userId;

    let user;
    if (specificUserId) {
      user = await prisma.user.findUnique({
        where: { id: specificUserId },
        include: { memberships: true },
      });
    } else {
      const email = ROLE_USER_MAP[targetRole] || 'kiruvantham@demo.recacts.app';
      user = await prisma.user.findUnique({
        where: { email },
        include: { memberships: true },
      });
    }

    if (!user) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    const membership = user.memberships[0];

    const token = signToken({
      userId: user.id,
      email: user.email,
      organizationId: membership?.organizationId,
      membershipId: membership?.id,
      role: targetRole,
      isPlatformAdmin: user.isPlatformAdmin,
    });

    const response = NextResponse.json({
      success: true,
      activeRole: targetRole,
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
