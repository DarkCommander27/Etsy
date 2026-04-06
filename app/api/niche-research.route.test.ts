import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { POST } from './niche-research/route';

function asNextRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/niche-research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe('niche research route', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a controlled 502 when Etsy sends a malformed success body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response('not-json', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    ));

    const response = await POST(asNextRequest({ keyword: 'adhd planner', etsyApiKey: 'test_key_1234' }));
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe('Etsy API returned an unexpected response.');
  });

  it('ignores invalid Etsy price payloads instead of returning NaN values', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        count: 2,
        results: [
          {
            listing_id: 111,
            title: 'Broken Price Listing',
            num_favorers: 30,
            views: 100,
            price: { amount: '123', divisor: null, currency_code: 'USD' },
          },
          {
            listing_id: 222,
            title: 'Valid Price Listing',
            num_favorers: 20,
            views: 80,
            price: { amount: 500, divisor: 100, currency_code: 'USD' },
          },
        ],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    ));

    const response = await POST(asNextRequest({ keyword: 'adhd planner', etsyApiKey: 'test_key_1234' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.avgPrice).toBe(5);
    expect(data.topListings[0].price).toBe('USD $?');
    expect(data.topListings[1].price).toBe('USD $5.00');
  });
});