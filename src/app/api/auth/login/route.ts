export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { signToken, verifyPassword } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const supabase = createClient();
    
    // 1. Attempt login with Supabase Auth
    let supabaseSuccess = false;
    let supabaseSession = null;

    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!error && data?.user) {
          supabaseSuccess = true;
          supabaseSession = data.session;
        }
      } catch (e) {
        console.warn('Supabase Auth error or key unconfigured:', e);
      }
    }

    // 2. Fetch user profile from Supabase PostgreSQL database
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

    // 3. Fallback password verification if user hasn't yet been synced to Supabase Auth table
    if (!supabaseSuccess) {
      const isPasswordValid = await verifyPassword(password, user.passwordHash);
      if (!isPasswordValid) {
        return NextResponse.json({ error: 'Invalid password. Please check your credentials.' }, { status: 401 });
      }

      // Automatically sign up / sync this user to Supabase Auth so future logins use Supabase Auth natively!
      try {
        await supabase.auth.signUp({
          email,
          password,
        });
      } catch (e) {
        // Ignored if user already exists in auth.users
      }
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
