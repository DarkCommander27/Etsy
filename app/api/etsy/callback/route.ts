import { NextRequest, NextResponse } from 'next/server';
import { getConfiguredEtsyApiKey, getPKCE, saveTokens, clearPKCE, fetchWithRetry, EtsyTokens } from '@/lib/etsy/client';

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

  const apiKey = getConfiguredEtsyApiKey();
  if (!apiKey) {
    return NextResponse.redirect(
      `${req.nextUrl.origin}/settings?etsy_error=${encodeURIComponent('Etsy API key not configured. Save it in Settings or set ETSY_API_KEY in .env.local.')}`
    );
  }

  const redirectUri = `${req.nextUrl.origin}/api/etsy/callback`;
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: apiKey,
    redirect_uri: redirectUri,
    code,
    code_verifier: pkce.verifier,
  });
  const res = await fetchWithRetry('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  }, { retries: 2 });

  if (!res.ok) {
    const rawErr = await res.text();
    // Truncate to avoid exceeding browser URL length limits (~2KB)
    const err = rawErr.slice(0, 200).replace(/[\r\n]+/g, ' ').trim() || 'Token exchange failed';
    return NextResponse.redirect(
      `${req.nextUrl.origin}/settings?etsy_error=${encodeURIComponent(err || 'Token exchange failed')}`
    );
  }

  const data = await res.json() as Record<string, unknown>;
  if (typeof data.access_token !== 'string' || typeof data.expires_in !== 'number' || typeof data.refresh_token !== 'string') {
    return NextResponse.redirect(
      `${req.nextUrl.origin}/settings?etsy_error=${encodeURIComponent('Token exchange returned an unexpected response. Please try again.')}`
    );
  }
  const tokens: EtsyTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    token_type: typeof data.token_type === 'string' ? data.token_type : 'Bearer',
  };

  saveTokens(tokens);
  clearPKCE();
  return NextResponse.redirect(`${req.nextUrl.origin}/settings?etsy_connected=1`);
}
