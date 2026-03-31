import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const LOCK_FILE = path.join(DATA_DIR, 'history.lock');
const LOCK_TIMEOUT_MS = 5000;

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

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

/** Acquire an exclusive write lock via a lock file. Returns a release function. */
async function acquireLock(): Promise<() => void> {
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      // O_EXCL ensures atomic create — only one process succeeds
      fs.writeFileSync(LOCK_FILE, String(process.pid), { flag: 'wx' });
      return () => { try { fs.unlinkSync(LOCK_FILE); } catch { /* already gone */ } };
    } catch {
      // Lock held by another request — yield to the event loop before retrying
      await new Promise<void>((r) => setTimeout(r, 5));
    }
  }
  // Timed out — stale lock, forcefully take it
  try { fs.unlinkSync(LOCK_FILE); } catch { /* ignore */ }
  fs.writeFileSync(LOCK_FILE, String(process.pid));
  return () => { try { fs.unlinkSync(LOCK_FILE); } catch { /* already gone */ } };
}

export function getHistory(): HistoryEntry[] {
  ensureDataDir();
  if (!fs.existsSync(HISTORY_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

export function saveHistory(entries: HistoryEntry[]) {
  ensureDataDir();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(entries, null, 2));
}

export async function addHistoryEntry(entry: HistoryEntry): Promise<void> {
  const release = await acquireLock();
  try {
    const history = getHistory();
    // Avoid duplicate IDs from retried requests
    if (history.some((e) => e.id === entry.id)) return;
    history.unshift(entry);
    saveHistory(history.slice(0, 500));
  } finally {
    release();
  }
}
