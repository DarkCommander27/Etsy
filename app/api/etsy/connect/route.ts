import { NextRequest, NextResponse } from 'next/server';
import { generatePKCE, savePKCE } from '@/lib/etsy/client';

export async function GET(req: NextRequest) {
  const apiKey = process.env.ETSY_API_KEY || req.nextUrl.searchParams.get('apiKey') || '';

  if (!apiKey) {
    return NextResponse.redirect(
      `${req.nextUrl.origin}/settings?etsy_error=${encodeURIComponent('Etsy API key not configured. Add ETSY_API_KEY to .env.local or enter it in Settings.')}`
    );
  }

  const { verifier, challenge, state } = generatePKCE();
  savePKCE(verifier, state);

  const redirectUri = `${req.nextUrl.origin}/api/etsy/callback`;
  const url = new URL('https://www.etsy.com/oauth/connect');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', 'listings_w listings_r');
  url.searchParams.set('client_id', apiKey);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');

  return NextResponse.redirect(url.toString());
}
