import { NextResponse } from 'next/server';
import { getAuthenticatedContext } from './auth';

export async function requireTenantContext() {
  const context = await getAuthenticatedContext();
  if (!context || !context.organization) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized or invalid organization context' },
        { status: 401 }
      ),
      context: null,
    };
  }

  return {
    error: null,
    context: {
      userId: context.user.id,
      membershipId: context.membership?.id || '',
      organizationId: context.organization.id,
      role: context.session.role,
      user: context.user,
      organization: context.organization,
      membership: context.membership,
    },
  };
}

export async function requireGodContext() {
  const context = await getAuthenticatedContext();
  if (!context || !context.user.isPlatformAdmin || context.session.role !== 'god') {
    return {
      error: NextResponse.json(
        { error: 'Forbidden. God Mode platform privileges required.' },
        { status: 403 }
      ),
      context: null,
    };
  }

  return {
    error: null,
    context: {
      userId: context.user.id,
      user: context.user,
    },
  };
}
