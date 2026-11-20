import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildZohoSprintTicketUrl } from '@/lib/zoho-url';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Ticket ID required' }, { status: 400 });
    }

    // Lookup ticket by id, reference, or zoho itemId
    const ticket = await prisma.ticket.findFirst({
      where: {
        OR: [
          { id },
          { reference: id },
          { reference: id.toUpperCase() },
        ],
      },
      select: {
        id: true,
        reference: true,
        rawPayload: true,
      },
    });

    if (!ticket) {
      // Fallback: If id is an itemId directly
      const targetUrl = buildZohoSprintTicketUrl({
        reference: id,
        rawPayload: { itemId: id },
      });
      return NextResponse.redirect(targetUrl, 302);
    }

    const targetUrl = buildZohoSprintTicketUrl(ticket);
    return NextResponse.redirect(targetUrl, 302);
  } catch (error: any) {
    console.error('Error redirecting to Zoho Sprints:', error);
    return NextResponse.json(
      { error: 'Failed to generate redirect URL' },
      { status: 500 }
    );
  }
}
