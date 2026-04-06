import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  mockGetConfiguredEtsyApiKey: vi.fn(),
  mockGetPKCE: vi.fn(),
  mockSaveTokens: vi.fn(),
  mockClearPKCE: vi.fn(),
  mockFetchWithRetry: vi.fn(),
}));

vi.mock('@/lib/etsy/client', () => ({
  getConfiguredEtsyApiKey: mocks.mockGetConfiguredEtsyApiKey,
  getPKCE: mocks.mockGetPKCE,
  saveTokens: mocks.mockSaveTokens,
  clearPKCE: mocks.mockClearPKCE,
  fetchWithRetry: mocks.mockFetchWithRetry,
}));

import { GET } from './callback/route';

function asNextRequest(url: string): NextRequest {
  return {
    nextUrl: new URL(url),
  } as NextRequest;
}

describe('etsy callback route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockGetConfiguredEtsyApiKey.mockReturnValue('test-key');
    mocks.mockGetPKCE.mockReturnValue({ verifier: 'verifier', state: 'good-state' });
  });

  it('redirects back to settings when token exchange returns malformed success JSON', async () => {
    mocks.mockFetchWithRetry.mockResolvedValue(
      new Response('not-json', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    );

    const response = await GET(asNextRequest('http://localhost/api/etsy/callback?code=abc&state=good-state'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('etsy_error=Token%20exchange%20returned%20an%20unexpected%20response');
    expect(mocks.mockSaveTokens).not.toHaveBeenCalled();
    expect(mocks.mockClearPKCE).not.toHaveBeenCalled();
  });
});