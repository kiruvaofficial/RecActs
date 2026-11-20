import { NextRequest, NextResponse } from 'next/server';
import { getActiveZohoAccessToken, saveZohoRefreshTokenToEnv, syncZohoTicketsToRecActs } from '@/lib/zoho-sprints';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const location = url.searchParams.get('location') || 'us';

  const baseUrl = `${url.protocol}//${url.host}`;

  if (error) {
    return NextResponse.redirect(`${baseUrl}/?zoho_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/?zoho_error=${encodeURIComponent('No authorization code received from Zoho')}`);
  }

  try {
    // Attempt exchange with the code using the exact redirect URI matching this request
    const callbackRedirectUri = `${baseUrl}/oauth/callback`;
    const tokenResult = await getActiveZohoAccessToken({
      refreshToken: code,
      region: location.includes('in') ? 'in' : 'us',
      redirectUri: callbackRedirectUri,
    });

    if (tokenResult?.accessToken) {
      // Find BlindMatrix org
      const org = await prisma.organization.findFirst({
        where: { slug: 'blindmatrix' },
      }) || await prisma.organization.findFirst();

      if (org) {
        const syncRes = await syncZohoTicketsToRecActs(org.id, {
          actorName: 'Zoho OAuth Integration',
        });
        return NextResponse.redirect(
          `${baseUrl}/?zoho_success=true&synced=${syncRes.totalSynced}&created=${syncRes.created}&updated=${syncRes.updated}`
        );
      }

      return NextResponse.redirect(`${baseUrl}/?zoho_success=true`);
    } else {
      return NextResponse.redirect(`${baseUrl}/?zoho_error=${encodeURIComponent('Failed to verify token with Zoho Sprints')}`);
    }
  } catch (err: any) {
    console.error('OAuth Callback exchange error:', err);
    return NextResponse.redirect(`${baseUrl}/?zoho_error=${encodeURIComponent(err?.message || 'Token exchange failed')}`);
  }
}
