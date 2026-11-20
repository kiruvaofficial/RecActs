import { NextRequest, NextResponse } from 'next/server';
import { exchangeZohoAuthCode, saveZohoRefreshTokenToDb } from '@/lib/zoho-sprints';

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
    // Attempt instant code exchange using the exact redirect URI matching this request (< 500ms)
    const callbackRedirectUri = `${baseUrl}/oauth/callback`;
    const tokenResult = await exchangeZohoAuthCode({
      code,
      redirectUri: callbackRedirectUri,
      region: location.includes('in') ? 'in' : 'us',
    });

    if (tokenResult?.accessToken) {
      if (tokenResult.refreshToken) {
        await saveZohoRefreshTokenToDb(tokenResult.refreshToken);
      }
      // Instant redirect back to app; client-side will show toast and trigger sync asynchronously
      return NextResponse.redirect(`${baseUrl}/?zoho_success=true&trigger_sync=true`);
    } else {
      return NextResponse.redirect(`${baseUrl}/?zoho_error=${encodeURIComponent('Failed to verify token with Zoho Sprints')}`);
    }
  } catch (err: any) {
    console.error('OAuth Callback exchange error:', err);
    return NextResponse.redirect(`${baseUrl}/?zoho_error=${encodeURIComponent(err?.message || 'Token exchange failed')}`);
  }
}
