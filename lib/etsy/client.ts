import crypto from 'crypto';
import { deleteStoredJson, getStoredJson, setStoredJson } from '@/lib/storage';
import { validateEtsyListing } from '@/lib/validation/generated';
import { sleep } from '@/lib/utils';

const ETSY_REQUEST_TIMEOUT_MS = 20_000;
const ETSY_APP_KEY_STORAGE_KEY = 'etsy_app_key';

function isTransientStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs = ETSY_REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchWithRetry(
  input: string,
  init: RequestInit,
  options?: { retries?: number; timeoutMs?: number }
): Promise<Response> {
  const retries = options?.retries ?? 2;
  const timeoutMs = options?.timeoutMs ?? ETSY_REQUEST_TIMEOUT_MS;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetchWithTimeout(input, init, timeoutMs);
      if (attempt < retries && isTransientStatus(res.status)) {
        await sleep(250 * (attempt + 1));
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await sleep(250 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Network request failed');
}

async function getResponseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.clone().json() as Record<string, unknown>;
    const message = (data.error as string) || (data.message as string);
    if (message) return message;
  } catch {
    // Ignore non-JSON responses
  }

  try {
    const text = (await res.text()).trim();
    if (text) return text;
  } catch {
    // Ignore unreadable bodies
  }

  return fallback;
}

export interface EtsyTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type: string;
}

export function getConfiguredEtsyApiKey(): string {
  return String(process.env.ETSY_API_KEY || getStoredJson<string>(ETSY_APP_KEY_STORAGE_KEY) || '').trim();
}

export function saveConfiguredEtsyApiKey(apiKey: string): void {
  const trimmed = apiKey.trim();
  if (!trimmed) return;
  setStoredJson(ETSY_APP_KEY_STORAGE_KEY, trimmed);
}

export function getTokens(): EtsyTokens | null {
  return getStoredJson<EtsyTokens>('etsy_tokens');
}

export function saveTokens(tokens: EtsyTokens) {
  setStoredJson('etsy_tokens', tokens);
}

export function savePKCE(verifier: string, state: string) {
  setStoredJson('etsy_pkce', { verifier, state });
}

export function getPKCE(): { verifier: string; state: string } | null {
  return getStoredJson<{ verifier: string; state: string }>('etsy_pkce');
}

export function clearPKCE(): void {
  deleteStoredJson('etsy_pkce');
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

  const res = await fetchWithRetry('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: apiKey,
      refresh_token: tokens.refresh_token,
    }),
  }, { retries: 2, timeoutMs: ETSY_REQUEST_TIMEOUT_MS });

  if (!res.ok) return null;
  const data = await res.json() as Record<string, unknown>;
  if (typeof data.access_token !== 'string' || typeof data.expires_in !== 'number') return null;
  const newTokens: EtsyTokens = {
    access_token: data.access_token,
    refresh_token: (typeof data.refresh_token === 'string' ? data.refresh_token : null) || tokens.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    token_type: typeof data.token_type === 'string' ? data.token_type : 'Bearer',
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
  const validated = validateEtsyListing({
    title: params.title,
    description: params.description,
    tags: params.tags,
  });
  if (!validated.success) {
    throw new Error(validated.error || validated.issues.join(' '));
  }
  if (!validated.data) {
    throw new Error('Validated Etsy listing was unexpectedly empty.');
  }
  const listingData = validated.data;

  const token = await getValidToken(params.apiKey);
  if (!token) throw new Error('Not connected to Etsy. Please reconnect in Settings.');

  const res = await fetchWithRetry(
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
        title: listingData.title,
        description: listingData.description,
        price: params.price,
        who_made: 'i_did',
        when_made: 'made_to_order',
        taxonomy_id: params.taxonomyId || 2078,
        type: 'download',
        tags: listingData.tags,
        state: 'draft',
      }),
    }
  );

  if (!res.ok) {
    throw new Error(await getResponseErrorMessage(res, `Etsy API error: ${res.status}`));
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

  const res = await fetchWithTimeout(
    `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/${listingId}/files`,
    {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    },
    ETSY_REQUEST_TIMEOUT_MS
  );

  if (!res.ok) {
    throw new Error(await getResponseErrorMessage(res, `Etsy file upload error: ${res.status}`));
  }

  return res.json();
}

export async function uploadListingImage(
  shopId: string,
  listingId: number,
  apiKey: string,
  imageBytes: Uint8Array,
  filename: string,
  rank = 1
) {
  const token = await getValidToken(apiKey);
  if (!token) throw new Error('Not connected to Etsy.');

  const formData = new FormData();
  const blob = new Blob([Buffer.from(imageBytes)], { type: 'image/png' });
  formData.append('image', blob, filename);
  formData.append('rank', String(rank));

  const res = await fetchWithTimeout(
    `https://openapi.etsy.com/v3/application/shops/${shopId}/listings/${listingId}/images`,
    {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    },
    ETSY_REQUEST_TIMEOUT_MS
  );

  if (!res.ok) {
    throw new Error(await getResponseErrorMessage(res, `Etsy image upload error: ${res.status}`));
  }

  return res.json();
}
