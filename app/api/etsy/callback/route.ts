import { NextRequest, NextResponse } from 'next/server';
import { getPKCE, saveTokens, EtsyTokens } from '@/lib/etsy/client';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const error = req.nextUrl.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      `${req.nextUrl.origin}/settings?etsy_error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${req.nextUrl.origin}/settings?etsy_error=${encodeURIComponent('Missing code or state')}`
    );
  }

  const pkce = getPKCE();
  if (!pkce || pkce.state !== state) {
    return NextResponse.redirect(
      `${req.nextUrl.origin}/settings?etsy_error=${encodeURIComponent('State mismatch. Please try connecting again.')}`
    );
  }

  const apiKey = process.env.ETSY_API_KEY || '';
  if (!apiKey) {
    return NextResponse.redirect(
      `${req.nextUrl.origin}/settings?etsy_error=${encodeURIComponent('ETSY_API_KEY not set in .env.local')}`
    );
  }

  const redirectUri = `${req.nextUrl.origin}/api/etsy/callback`;
  const res = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: apiKey,
      redirect_uri: redirectUri,
      code,
      code_verifier: pkce.verifier,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.redirect(
      `${req.nextUrl.origin}/settings?etsy_error=${encodeURIComponent(err || 'Token exchange failed')}`
    );
  }

  const data = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };
  const tokens: EtsyTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    token_type: data.token_type,
  };

  saveTokens(tokens);
  return NextResponse.redirect(`${req.nextUrl.origin}/settings?etsy_connected=1`);
}
