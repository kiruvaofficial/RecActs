import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import prisma from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'recacts-production-secure-secret-key-32chars-min-2026';
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'recacts_session';

export interface SessionPayload {
  userId: string;
  email: string;
  organizationId?: string;
  membershipId?: string;
  role: string; // member, lead, manager, hr, owner, god
  isPlatformAdmin?: boolean;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch (error) {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function getAuthenticatedContext() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      platformRoles: true,
      memberships: {
        include: {
          organization: true,
          roles: {
            include: {
              role: true,
            },
          },
          team: true,
        },
      },
    },
  });

  if (!user) return null;

  const currentMembership = session.membershipId
    ? user.memberships.find((m) => m.id === session.membershipId)
    : user.memberships[0];

  return {
    user,
    session,
    membership: currentMembership,
    organization: currentMembership?.organization || null,
  };
}
