import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { claimPublishIdempotency, getStorageDb, resetStorageForTests } from '@/lib/storage';

const IDEMPOTENCY_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const IN_PROGRESS_TTL_MS = 10 * 60 * 1000;

describe('publish idempotency claims', () => {
  beforeEach(() => {
    resetStorageForTests();
  });

  afterEach(() => {
    resetStorageForTests();
  });

  it('reclaims stale in-progress keys after the shorter in-progress timeout', () => {
    const db = getStorageDb();
    db.prepare(
      'INSERT INTO publish_idempotency (key, listing_id, created_at) VALUES (?, 0, ?)'
    ).run('stale-key', new Date(Date.now() - IN_PROGRESS_TTL_MS - 1000).toISOString());

    expect(claimPublishIdempotency('stale-key', IDEMPOTENCY_TTL_MS, IN_PROGRESS_TTL_MS)).toEqual({ status: 'claimed' });
  });

  it('keeps fresh in-progress keys locked', () => {
    const db = getStorageDb();
    const createdAt = new Date().toISOString();
    db.prepare(
      'INSERT INTO publish_idempotency (key, listing_id, created_at) VALUES (?, 0, ?)'
    ).run('fresh-key', createdAt);

    expect(claimPublishIdempotency('fresh-key', IDEMPOTENCY_TTL_MS, IN_PROGRESS_TTL_MS)).toEqual({
      status: 'in-progress',
      createdAt,
    });
  });
});