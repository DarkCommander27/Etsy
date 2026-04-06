import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  mockGetHistory: vi.fn(),
  mockAddHistoryEntry: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  getHistory: mocks.mockGetHistory,
  addHistoryEntry: mocks.mockAddHistoryEntry,
}));

import { GET, POST } from './history/route';

function asNextRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe('history route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns stored history entries', async () => {
    mocks.mockGetHistory.mockReturnValue([
      {
        id: 'entry-1',
        nicheId: 'adhd',
        productTypeId: 'daily-planner',
        title: 'ADHD Daily Planner',
        colorScheme: 'calm-blue',
        pageSize: 'letter',
        createdAt: '2026-04-05T00:00:00.000Z',
      },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.history).toHaveLength(1);
    expect(data.history[0].title).toBe('ADHD Daily Planner');
  });

  it('returns 500 when history loading fails', async () => {
    mocks.mockGetHistory.mockImplementation(() => {
      throw new Error('db unavailable');
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to load history.');
  });

  it('rejects invalid history payloads', async () => {
    const response = await POST(asNextRequest({ title: 'Missing fields' }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid history entry');
    expect(mocks.mockAddHistoryEntry).not.toHaveBeenCalled();
  });

  it('returns 400 for malformed JSON bodies on the POST route', async () => {
    const malformedReq = new Request('http://localhost/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid',
    }) as unknown as NextRequest;

    const response = await POST(malformedReq);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid JSON body');
    expect(mocks.mockAddHistoryEntry).not.toHaveBeenCalled();
  });

  it('stores valid history payloads', async () => {
    mocks.mockAddHistoryEntry.mockResolvedValue(undefined);

    const response = await POST(asNextRequest({
      id: 'entry-2',
      nicheId: 'adhd',
      productTypeId: 'daily-planner',
      title: 'ADHD Daily Planner',
      colorScheme: 'calm-blue',
      pageSize: 'letter',
      createdAt: '2026-04-05T00:00:00.000Z',
    }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(mocks.mockAddHistoryEntry).toHaveBeenCalledTimes(1);
  });
});