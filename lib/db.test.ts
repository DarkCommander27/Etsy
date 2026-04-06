import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addHistoryEntry, getHistory } from '@/lib/db';
import { getStorageDb, resetStorageForTests } from '@/lib/storage';

describe('history storage', () => {
  beforeEach(() => {
    resetStorageForTests();
  });

  afterEach(() => {
    resetStorageForTests();
  });

  it('drops malformed stored JSON fields instead of failing the entire history read', () => {
    const db = getStorageDb();
    db.prepare(`
      INSERT INTO history_entries
      (id, niche_id, product_type_id, title, color_scheme, page_size, created_at, content_json, generated_images_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'broken-entry',
      'adhd',
      'daily-planner',
      'ADHD Daily Planner',
      'calm-blue',
      'letter',
      '2026-04-05T00:00:00.000Z',
      '{broken',
      '[invalid'
    );

    const history = getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].title).toBe('ADHD Daily Planner');
    expect(history[0].content).toBeUndefined();
    expect(history[0].generatedImages).toBeUndefined();
  });

  it('stores entries even when optional JSON fields cannot be serialized', async () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    await addHistoryEntry({
      id: 'circular-entry',
      nicheId: 'adhd',
      productTypeId: 'daily-planner',
      title: 'ADHD Daily Planner',
      colorScheme: 'calm-blue',
      pageSize: 'letter',
      createdAt: '2026-04-05T00:00:00.000Z',
      content: circular,
      generatedImages: circular as unknown as Array<{
        id: string;
        rank: number;
        filename: string;
        url: string;
        width: number;
        height: number;
        prompt: string;
        createdAt: string;
      }>,
    });

    const history = getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe('circular-entry');
    expect(history[0].content).toBeUndefined();
    expect(history[0].generatedImages).toBeUndefined();
  });
});