export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { signToken, verifyPassword } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getBootstrapData } from '@/lib/bootstrap';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // 1. Fast-Path: Query user profile directly from PostgreSQL database (local/pooled check)
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        platformRoles: true,
        memberships: {
          include: {
            organization: true,
            team: true,
            roles: {
              include: { role: true },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'No user account found for this email address.' },
        { status: 401 }
      );
    }

    // 2. Validate password with high-speed bcrypt comparison (<50ms)
    let isPasswordValid = await verifyPassword(password, user.passwordHash);
    let supabaseSession = null;

    if (!isPasswordValid) {
      // Fallback: If local bcrypt hash did not match, check Supabase Auth
      const supabase = createClient();
      if (supabase) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (!error && data?.user) {
            isPasswordValid = true;
            supabaseSession = data.session;
          }
        } catch (e) {
          console.warn('Supabase Auth verification error:', e);
        }
      }
    } else {
      // Non-blocking background sync to Supabase Auth so it never blocks or delays login
      const supabase = createClient();
      if (supabase) {
        Promise.resolve().then(async () => {
          try {
            await supabase.auth.signUp({ email, password });
          } catch {}
        });
      }
    }

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid password. Please check your credentials.' }, { status: 401 });
    }

    const membership = user.memberships[0];
    let role = 'member';
    if (user.isPlatformAdmin) role = 'god';
    else if (membership?.designation?.toLowerCase().includes('manager')) role = 'manager';
    else if (membership?.designation?.toLowerCase().includes('lead')) role = 'lead';
    else if (membership?.designation?.toLowerCase().includes('hr')) role = 'hr';
    else if (membership?.designation?.toLowerCase().includes('director')) role = 'owner';

    const token = signToken({
      userId: user.id,
      email: user.email,
      organizationId: membership?.organizationId,
      membershipId: membership?.id,
      role,
      isPlatformAdmin: user.isPlatformAdmin,
    });

    // 3. Pre-load complete bootstrap data on the server in the SAME request
    // Eliminates the 4-5 second "load data after login" delay completely!
    let bootstrapData = null;
    if (membership?.organizationId && membership?.id) {
      try {
        bootstrapData = await getBootstrapData({
          organizationId: membership.organizationId,
          membershipId: membership.id,
          userId: user.id,
          role,
          user,
          organization: membership.organization,
          period: '2026-10',
          workDate: '2026-10-31',
        });
      } catch (err) {
        console.warn('Warning: bootstrap pre-load during login failed:', err);
      }
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        initials: user.initials,
        isPlatformAdmin: user.isPlatformAdmin,
      },
      activeRole: role,
      activeMembership: membership,
      organization: membership?.organization || null,
      bootstrap: bootstrapData,
      supabaseSession: supabaseSession
        ? {
            accessToken: supabaseSession.access_token,
            expiresAt: supabaseSession.expires_at,
          }
        : null,
    });

    response.cookies.set('recacts_session', token, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
    });

    return response;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: err.message || 'Login failed' }, { status: 500 });
  }
}
