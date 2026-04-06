import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getHistory, addHistoryEntry, HistoryEntry } from '@/lib/db';
import { readRequestJson } from '@/lib/utils';

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
  } catch {
    return NextResponse.json({ error: 'Failed to load history.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const parsedBody = await readRequestJson<unknown>(req);
  if (!parsedBody.ok) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const body: unknown = parsedBody.data;
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
