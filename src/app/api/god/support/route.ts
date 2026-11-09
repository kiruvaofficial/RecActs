import { NextRequest, NextResponse } from 'next/server';
import { requireGodContext } from '@/lib/tenant';
import prisma from '@/lib/prisma';
import { logPlatformAuditEvent } from '@/lib/audit';

export async function GET() {
  const { error, context } = await requireGodContext();
  if (error || !context) return error;

  try {
    const sessions = await prisma.supportSession.findMany({
      include: { organization: true },
      orderBy: { startedAt: 'desc' },
    });

    const formatted = sessions.map((s) => ({
      id: s.id,
      sessionCode: s.sessionCode,
      orgName: s.organization.name,
      reason: s.reason,
      status: s.status,
      consentGivenBy: s.consentGivenBy,
      durationMinutes: s.durationMinutes,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
    }));

    return NextResponse.json({ supportSessions: formatted });
  } catch (err) {
    console.error('Error fetching support sessions:', err);
    return NextResponse.json({ error: 'Failed to fetch support sessions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error, context } = await requireGodContext();
  if (error || !context) return error;

  try {
    const body = await req.json();
    const { orgSlug, reason, consentGivenBy } = body;

    const org = await prisma.organization.findUnique({
      where: { slug: orgSlug || 'northwind' },
    });

    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const sessionCode = `SS-${Math.floor(100 + Math.random() * 900)}`;

    const session = await prisma.supportSession.create({
      data: {
        organizationId: org.id,
        sessionCode,
        reason: reason || 'Customer investigation request',
        consentGivenBy: consentGivenBy || 'Org Owner',
        status: 'Open',
      },
    });

    await logPlatformAuditEvent(
      'Platform Admin',
      `Started time-limited support session ${sessionCode} on ${org.name} (consent: ${session.consentGivenBy})`,
      'Support'
    );

    return NextResponse.json({ success: true, session });
  } catch (err) {
    console.error('Error starting support session:', err);
    return NextResponse.json({ error: 'Failed to start support session' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { error, context } = await requireGodContext();
  if (error || !context) return error;

  try {
    const body = await req.json();
    const { sessionCode } = body;

    const session = await prisma.supportSession.findUnique({
      where: { sessionCode },
      include: { organization: true },
    });

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const updated = await prisma.supportSession.update({
      where: { sessionCode },
      data: {
        status: 'Closed',
        endedAt: new Date(),
      },
    });

    await logPlatformAuditEvent(
      'Platform Admin',
      `Ended support session ${sessionCode} on ${session.organization.name}`,
      'Support'
    );

    return NextResponse.json({ success: true, session: updated });
  } catch (err) {
    console.error('Error closing support session:', err);
    return NextResponse.json({ error: 'Failed to close support session' }, { status: 500 });
  }
}
