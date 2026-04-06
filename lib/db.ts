import { getStorageDb } from '@/lib/storage';

function safeParseHistoryJson<T>(value: string | null): T | undefined {
  if (!value) return undefined;

  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

function safeStringifyHistoryJson(value: unknown): string | null {
  if (value === undefined) return null;

  try {
    const serialized = JSON.stringify(value);
    return typeof serialized === 'string' ? serialized : null;
  } catch {
    return null;
  }
}

export interface HistoryEntry {
  id: string;
  nicheId: string;
  productTypeId: string;
  title: string;
  colorScheme: string;
  pageSize: string;
  createdAt: string;
  content?: unknown;
  generatedImages?: Array<{
    id: string;
    rank: number;
    filename: string;
    url: string;
    width: number;
    height: number;
    prompt: string;
    createdAt: string;
  }>;
}

export function getHistory(): HistoryEntry[] {
  const db = getStorageDb();
  const rows = db.prepare(`
    SELECT id, niche_id, product_type_id, title, color_scheme, page_size, created_at, content_json, generated_images_json
    FROM history_entries
    ORDER BY datetime(created_at) DESC, rowid DESC
    LIMIT 500
  `).all() as Array<{
    id: string;
    niche_id: string;
    product_type_id: string;
    title: string;
    color_scheme: string;
    page_size: string;
    created_at: string;
    content_json: string | null;
    generated_images_json: string | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    nicheId: row.niche_id,
    productTypeId: row.product_type_id,
    title: row.title,
    colorScheme: row.color_scheme,
    pageSize: row.page_size,
    createdAt: row.created_at,
    content: safeParseHistoryJson(row.content_json),
    generatedImages: safeParseHistoryJson(row.generated_images_json),
  }));
}

export async function addHistoryEntry(entry: HistoryEntry): Promise<void> {
  const db = getStorageDb();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO history_entries
    (id, niche_id, product_type_id, title, color_scheme, page_size, created_at, content_json, generated_images_json)
    VALUES (@id, @niche_id, @product_type_id, @title, @color_scheme, @page_size, @created_at, @content_json, @generated_images_json)
  `);

  insert.run({
    id: entry.id,
    niche_id: entry.nicheId,
    product_type_id: entry.productTypeId,
    title: entry.title,
    color_scheme: entry.colorScheme,
    page_size: entry.pageSize,
    created_at: entry.createdAt,
    content_json: safeStringifyHistoryJson(entry.content),
    generated_images_json: safeStringifyHistoryJson(entry.generatedImages),
  });

  db.prepare(`
    DELETE FROM history_entries
    WHERE id NOT IN (
      SELECT id FROM history_entries
      ORDER BY datetime(created_at) DESC, rowid DESC
      LIMIT 500
    )
  `).run();
}
