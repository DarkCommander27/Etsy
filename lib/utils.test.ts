import { describe, expect, it } from 'vitest';
import { getApiErrorMessage, readJsonResponse } from '@/lib/utils';

describe('getApiErrorMessage', () => {
  it('returns fallback for null payloads', () => {
    expect(getApiErrorMessage(null, 'Fallback error')).toBe('Fallback error');
  });

  it('joins string details onto the main error', () => {
    expect(getApiErrorMessage({ error: 'Bad request', details: ['missing title', 123, 'retry later'] }, 'Fallback')).toBe(
      'Bad request missing title retry later'
    );
  });
});

describe('readJsonResponse', () => {
  it('parses valid JSON bodies', async () => {
    const response = new Response(JSON.stringify({ error: 'boom' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(readJsonResponse<{ error: string }>(response)).resolves.toEqual({ error: 'boom' });
  });

  it('returns null for malformed non-JSON bodies', async () => {
    const response = new Response('<html>Bad gateway</html>', {
      status: 502,
      headers: { 'Content-Type': 'text/html' },
    });

    await expect(readJsonResponse(response)).resolves.toBeNull();
  });
});