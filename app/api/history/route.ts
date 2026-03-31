import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getHistory, addHistoryEntry, HistoryEntry } from '@/lib/db';

const historyEntrySchema = z.object({
  id: z.string(),
  nicheId: z.string(),
  productTypeId: z.string(),
  title: z.string(),
  colorScheme: z.string().optional().default(''),
  pageSize: z.string().optional().default('letter'),
  createdAt: z.string(),
  content: z.unknown().optional(),
  generatedImages: z.array(z.object({
    id: z.string(),
    rank: z.number(),
    filename: z.string(),
    url: z.string(),
    width: z.number(),
    height: z.number(),
    prompt: z.string(),
    createdAt: z.string(),
  })).optional(),
});

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
    const body: unknown = await req.json();
    const parsed = historyEntrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid history entry', details: parsed.error.flatten() }, { status: 400 });
    }
    await addHistoryEntry(parsed.data as HistoryEntry);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
