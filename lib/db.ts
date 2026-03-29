import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

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

export function addHistoryEntry(entry: HistoryEntry) {
  const history = getHistory();
  history.unshift(entry);
  saveHistory(history.slice(0, 500));
}
