import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = process.env.SQLITE_DATABASE_PATH || (process.env.NODE_ENV === 'test' ? ':memory:' : path.join(DATA_DIR, 'etsygen.db'));
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const AUTH_FILE = path.join(DATA_DIR, 'etsy-auth.json');
const PKCE_FILE = path.join(DATA_DIR, 'etsy-pkce.json');
const IDEMPOTENCY_FILE = path.join(DATA_DIR, 'publish-idempotency.json');

type StorageDatabase = Database.Database;

declare global {
  var __etsyStorageDb: StorageDatabase | undefined;
}

function ensureDataDir() {
  if (DB_PATH !== ':memory:' && !fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function safeReadJson<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return null;
  }
}

function initializeSchema(db: StorageDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS history_entries (
      id TEXT PRIMARY KEY,
      niche_id TEXT NOT NULL,
      product_type_id TEXT NOT NULL,
      title TEXT NOT NULL,
      color_scheme TEXT NOT NULL,
      page_size TEXT NOT NULL,
      created_at TEXT NOT NULL,
      content_json TEXT,
      generated_images_json TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_history_created_at ON history_entries(created_at DESC);

    CREATE TABLE IF NOT EXISTS app_kv (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS publish_idempotency (
      key TEXT PRIMARY KEY,
      listing_id INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_publish_idempotency_created_at ON publish_idempotency(created_at DESC);
  `);
}

function migrateLegacyFiles(db: StorageDatabase) {
  if (DB_PATH === ':memory:') return;

  const historyCountRow = db.prepare('SELECT COUNT(*) as count FROM history_entries').get() as { count?: number } | undefined;
  const historyCount = Number(historyCountRow?.count || 0);
  if (historyCount === 0) {
    const history = safeReadJson<Array<{
      id: string;
      nicheId: string;
      productTypeId: string;
      title: string;
      colorScheme?: string;
      pageSize?: string;
      createdAt: string;
      content?: unknown;
      generatedImages?: unknown;
    }>>(HISTORY_FILE) || [];

    const insertHistory = db.prepare(`
      INSERT OR IGNORE INTO history_entries
      (id, niche_id, product_type_id, title, color_scheme, page_size, created_at, content_json, generated_images_json)
      VALUES (@id, @niche_id, @product_type_id, @title, @color_scheme, @page_size, @created_at, @content_json, @generated_images_json)
    `);

    const transaction = db.transaction((rows: typeof history) => {
      for (const row of rows) {
        insertHistory.run({
          id: row.id,
          niche_id: row.nicheId,
          product_type_id: row.productTypeId,
          title: row.title,
          color_scheme: row.colorScheme || 'default',
          page_size: row.pageSize || 'letter',
          created_at: row.createdAt,
          content_json: row.content === undefined ? null : JSON.stringify(row.content),
          generated_images_json: row.generatedImages === undefined ? null : JSON.stringify(row.generatedImages),
        });
      }
    });

    transaction(history);
  }

  const kvCountRow = db.prepare('SELECT COUNT(*) as count FROM app_kv').get() as { count?: number } | undefined;
  const kvCount = Number(kvCountRow?.count || 0);
  if (kvCount === 0) {
    const tokens = safeReadJson<Record<string, unknown>>(AUTH_FILE);
    const pkce = safeReadJson<Record<string, unknown>>(PKCE_FILE);
    if (tokens) {
      db.prepare('INSERT OR REPLACE INTO app_kv (key, value_json, updated_at) VALUES (?, ?, ?)').run(
        'etsy_tokens',
        JSON.stringify(tokens),
        new Date().toISOString(),
      );
    }
    if (pkce) {
      db.prepare('INSERT OR REPLACE INTO app_kv (key, value_json, updated_at) VALUES (?, ?, ?)').run(
        'etsy_pkce',
        JSON.stringify(pkce),
        new Date().toISOString(),
      );
    }
  }

  const idempotencyCountRow = db.prepare('SELECT COUNT(*) as count FROM publish_idempotency').get() as { count?: number } | undefined;
  const idempotencyCount = Number(idempotencyCountRow?.count || 0);
  if (idempotencyCount === 0) {
    const legacyStore = safeReadJson<Record<string, { listing_id: number; createdAt: string }>>(IDEMPOTENCY_FILE) || {};
    const insertIdempotency = db.prepare(
      'INSERT OR REPLACE INTO publish_idempotency (key, listing_id, created_at) VALUES (?, ?, ?)'
    );
    const transaction = db.transaction((entries: Array<[string, { listing_id: number; createdAt: string }]>) => {
      for (const [key, value] of entries) {
        insertIdempotency.run(key, value.listing_id, value.createdAt);
      }
    });
    transaction(Object.entries(legacyStore));
  }
}

export function getStorageDb(): StorageDatabase {
  if (!globalThis.__etsyStorageDb) {
    ensureDataDir();
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeSchema(db);
    migrateLegacyFiles(db);
    globalThis.__etsyStorageDb = db;
  }

  return globalThis.__etsyStorageDb;
}

export function getStoredJson<T>(key: string): T | null {
  const db = getStorageDb();
  const row = db.prepare('SELECT value_json FROM app_kv WHERE key = ?').get(key) as { value_json: string } | undefined;
  if (!row) return null;

  try {
    return JSON.parse(row.value_json) as T;
  } catch {
    return null;
  }
}

export function setStoredJson(key: string, value: unknown): void {
  const db = getStorageDb();
  db.prepare(
    'INSERT OR REPLACE INTO app_kv (key, value_json, updated_at) VALUES (?, ?, ?)'
  ).run(key, JSON.stringify(value), new Date().toISOString());
}

export function deleteStoredJson(key: string): void {
  const db = getStorageDb();
  db.prepare('DELETE FROM app_kv WHERE key = ?').run(key);
}

export function prunePublishIdempotency(maxAgeMs: number, maxEntries: number): void {
  const db = getStorageDb();
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
  db.prepare('DELETE FROM publish_idempotency WHERE created_at < ?').run(cutoff);

  if (maxEntries > 0) {
    db.prepare(`
      DELETE FROM publish_idempotency
      WHERE key NOT IN (
        SELECT key FROM publish_idempotency
        ORDER BY datetime(created_at) DESC
        LIMIT ?
      )
    `).run(maxEntries);
  }
}

export function getPublishIdempotency(key: string, maxAgeMs: number): { listing_id: number; createdAt: string } | null {
  prunePublishIdempotency(maxAgeMs, 0);
  const db = getStorageDb();
  const row = db.prepare(
    'SELECT listing_id, created_at FROM publish_idempotency WHERE key = ? LIMIT 1'
  ).get(key) as { listing_id: number; created_at: string } | undefined;

  if (!row) return null;
  return {
    listing_id: row.listing_id,
    createdAt: row.created_at,
  };
}

export function setPublishIdempotency(key: string, listingId: number, maxAgeMs: number, maxEntries: number): void {
  const db = getStorageDb();
  db.prepare(
    'INSERT OR REPLACE INTO publish_idempotency (key, listing_id, created_at) VALUES (?, ?, ?)'
  ).run(key, listingId, new Date().toISOString());
  prunePublishIdempotency(maxAgeMs, maxEntries);
}

export function resetStorageForTests(): void {
  if (process.env.NODE_ENV !== 'test') return;
  const db = getStorageDb();
  db.exec(`
    DELETE FROM history_entries;
    DELETE FROM app_kv;
    DELETE FROM publish_idempotency;
  `);
}