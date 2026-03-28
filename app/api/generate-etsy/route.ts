import { NextRequest, NextResponse } from 'next/server';
import { generateContent, AISettings } from '@/lib/ai/client';
import { getEtsyListingPrompt } from '@/lib/ai/prompts';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nicheId, productTypeId, productName, settings } = body as {
      nicheId: string; productTypeId: string; productName: string; settings?: AISettings;
    };
    const prompt = getEtsyListingPrompt(nicheId, productTypeId, productName);
    const raw = await generateContent(prompt, settings);
    let listing: Record<string, unknown>;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      listing = match ? JSON.parse(match[0]) : { title: productName, tags: [], description: raw };
    } catch {
      listing = { title: productName, tags: [], description: raw };
    }
    return NextResponse.json({ listing });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
