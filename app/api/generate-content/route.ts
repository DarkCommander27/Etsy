import { NextRequest, NextResponse } from 'next/server';
import { generateContent, AISettings } from '@/lib/ai/client';
import { getContentPrompt } from '@/lib/ai/prompts';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nicheId, productTypeId, customTitle, settings } = body as {
      nicheId: string; productTypeId: string; customTitle?: string; settings?: AISettings;
    };
    const prompt = getContentPrompt(nicheId, productTypeId, customTitle);
    const raw = await generateContent(prompt, settings);
    let content: Record<string, unknown>;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      content = match ? JSON.parse(match[0]) : { title: customTitle || productTypeId, raw };
    } catch {
      content = { title: customTitle || productTypeId, raw };
    }
    return NextResponse.json({ content });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
