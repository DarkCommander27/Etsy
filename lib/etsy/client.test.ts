import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createListing, refreshTokens, saveTokens } from '@/lib/etsy/client';
import { resetStorageForTests } from '@/lib/storage';

describe('etsy client', () => {
  beforeEach(() => {
    resetStorageForTests();
    saveTokens({
      access_token: 'valid-token',
      refresh_token: 'refresh-token',
      expires_at: Date.now() + 5 * 60_000,
      token_type: 'Bearer',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetStorageForTests();
  });

  it('throws a clear error when Etsy returns a success payload without listing_id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    ));

    await expect(createListing({
      shopId: '12345',
      apiKey: 'test-key',
      title: 'ADHD Daily Planner Printable Digital Download',
      description: [
        'This ADHD daily planner printable is an instant digital download that gives buyers a practical PDF format page for priorities, focus blocks, and reflection prompts they can actually use every day without extra setup.',
        ...Array.from({ length: 215 }, (_, index) => `detail${index}`),
      ].join(' '),
      tags: [
        'adhd planner',
        'daily planner',
        'printable pdf',
        'digital download',
        'focus planner',
        'productivity',
        'task organizer',
        'instant download',
        'planner page',
        'minimal planner',
        'adhd printable',
        'life organizer',
        'daily routine',
      ],
      price: 5,
    })).rejects.toThrow('Etsy API returned an invalid listing response.');
  });

  it('returns the validated listing payload when listing_id exists', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ listing_id: 123456, state: 'draft' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    ));

    await expect(createListing({
      shopId: '12345',
      apiKey: 'test-key',
      title: 'ADHD Daily Planner Printable Digital Download',
      description: [
        'This ADHD daily planner printable is an instant digital download that gives buyers a practical PDF format page for priorities, focus blocks, and reflection prompts they can actually use every day without extra setup.',
        ...Array.from({ length: 215 }, (_, index) => `detail${index}`),
      ].join(' '),
      tags: [
        'adhd planner',
        'daily planner',
        'printable pdf',
        'digital download',
        'focus planner',
        'productivity',
        'task organizer',
        'instant download',
        'planner page',
        'minimal planner',
        'adhd printable',
        'life organizer',
        'daily routine',
      ],
      price: 5,
    })).resolves.toMatchObject({ listing_id: 123456 });
  });

  it('returns null instead of throwing when token refresh gets a malformed success body', async () => {
    saveTokens({
      access_token: 'expired-token',
      refresh_token: 'refresh-token',
      expires_at: Date.now() - 60_000,
      token_type: 'Bearer',
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response('not-json', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    ));

    await expect(refreshTokens('test-key')).resolves.toBeNull();
  });
});