import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const AUTH_FILE = path.join(DATA_DIR, 'etsy-auth.json');
const PKCE_FILE = path.join(DATA_DIR, 'etsy-pkce.json');

export interface EtsyTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type: string;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function getTokens(): EtsyTokens | null {
  ensureDataDir();
  if (!fs.existsSync(AUTH_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
  } catch { return null; }
}

export function saveTokens(tokens: EtsyTokens) {
  ensureDataDir();
  fs.writeFileSync(AUTH_FILE, JSON.stringify(tokens, null, 2));
}

export function savePKCE(verifier: string, state: string) {
  ensureDataDir();
  fs.writeFileSync(PKCE_FILE, JSON.stringify({ verifier, state }, null, 2));
}

export function getPKCE(): { verifier: string; state: string } | null {
  if (!fs.existsSync(PKCE_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(PKCE_FILE, 'utf-8'));
  } catch { return null; }
}

export function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('hex');
  return { verifier, challenge, state };
}

export function isConnected(): boolean {
  const tokens = getTokens();
  if (!tokens) return false;
  return tokens.expires_at > Date.now() + 60_000;
}

export async function refreshTokens(apiKey: string): Promise<EtsyTokens | null> {
  const tokens = getTokens();
  if (!tokens?.refresh_token) return null;

  const res = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: apiKey,
      refresh_token: tokens.refresh_token,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const newTokens: EtsyTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || tokens.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    token_type: data.token_type,
  };
  saveTokens(newTokens);
  return newTokens;
}

export async function getValidToken(apiKey: string): Promise<string | null> {
  let tokens = getTokens();
  if (!tokens) return null;
  if (tokens.expires_at < Date.now() + 60_000) {
    tokens = await refreshTokens(apiKey);
  }
  return tokens?.access_token || null;
}

export interface CreateListingParams {
  shopId: string;
  apiKey: string;
  title: string;
  description: string;
  tags: string[];
  price: number;
  taxonomyId?: number;
}

export async function createListing(params: CreateListingParams) {
  const token = await getValidToken(params.apiKey);
  if (!token) throw new Error('Not connected to Etsy. Please reconnect in Settings.');

  const res = await fetch(
    `https://openapi.etsy.com/v3/application/shops/${params.shopId}/listings`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': params.apiKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        quantity: 999,
        title: params.title.substring(0, 140),
        description: params.description,
        price: params.price,
        who_made: 'i_did',
        when_made: 'made_to_order',
        taxonomy_id: params.taxonomyId || 2078,
        type: 'download',
        tags: params.tags.slice(0, 13).map((t) => t.substring(0, 20)),
        state: 'draft',
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error((err?.error as string) || `Etsy API error: ${res.status}`);
  }

  return res.json();
}

export async function uploadListingFile(
  shopId: string,
  listingId: number,
  apiKey: string,
  pdfBytes: Uint8Array,
  filename: string
) {
  const token = await getValidToken(apiKey);
  if (!token) throw new Error('Not connected to Etsy.');

  const formData = new FormData();
  const blob = new Blob([Buffer.from(pdfBytes)], { type: 'application/pdf' });
  formData.append('file', blob, filename);
  formData.append('name', filename);
  formData.append('rank', '1');

  const res = await fetch(
    `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/${listingId}/files`,
    {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error((err?.error as string) || `Etsy file upload error: ${res.status}`);
  }

  return res.json();
}
