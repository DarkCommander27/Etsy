import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  mockGeneratePKCE: vi.fn(),
  mockGetConfiguredEtsyApiKey: vi.fn(),
  mockSaveConfiguredEtsyApiKey: vi.fn(),
  mockSavePKCE: vi.fn(),
}));

vi.mock('@/lib/etsy/client', () => ({
  generatePKCE: mocks.mockGeneratePKCE,
  getConfiguredEtsyApiKey: mocks.mockGetConfiguredEtsyApiKey,
  saveConfiguredEtsyApiKey: mocks.mockSaveConfiguredEtsyApiKey,
  savePKCE: mocks.mockSavePKCE,
}));

import { GET } from './connect/route';

function asNextRequest(url: string): NextRequest {
  return {
    nextUrl: new URL(url),
  } as NextRequest;
}

describe('etsy connect route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockGeneratePKCE.mockReturnValue({
      verifier: 'verifier',
      challenge: 'challenge',
      state: 'state',
    });
  });

  it('stores a provided keystring and redirects to Etsy OAuth', async () => {
    mocks.mockGetConfiguredEtsyApiKey.mockReturnValue('');

    const response = await GET(asNextRequest('http://localhost/api/etsy/connect?apiKey=test-key'));

    expect(response.status).toBe(307);
    expect(mocks.mockSaveConfiguredEtsyApiKey).toHaveBeenCalledWith('test-key');
    expect(mocks.mockSavePKCE).toHaveBeenCalledWith('verifier', 'state');
    expect(response.headers.get('location')).toContain('client_id=test-key');
  });

  it('returns to settings when no keystring is available', async () => {
    mocks.mockGetConfiguredEtsyApiKey.mockReturnValue('');

    const response = await GET(asNextRequest('http://localhost/api/etsy/connect'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/settings?etsy_error=');
  });
});