import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockIsConnected: vi.fn(),
}));

vi.mock('@/lib/etsy/client', () => ({
  isConnected: mocks.mockIsConnected,
}));

import { GET } from './status/route';

describe('etsy status route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the current Etsy connection status for the settings screen', async () => {
    mocks.mockIsConnected.mockReturnValue(true);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ connected: true });
  });
});