import { NextRequest, NextResponse } from 'next/server';
import { getHistory, addHistoryEntry, HistoryEntry } from '@/lib/db';

export async function GET() {
  try {
    const history = getHistory();
    return NextResponse.json({ history });
  } catch (err) {
    return NextResponse.json({ history: [], error: String(err) });
  }
}

export async function POST(req: NextRequest) {
  try {
    const entry = await req.json() as HistoryEntry;
    addHistoryEntry(entry);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
