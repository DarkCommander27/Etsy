import { NextRequest, NextResponse } from 'next/server';
import { generateContent, AISettings } from '@/lib/ai/client';
import { getEtsyListingPrompt } from '@/lib/ai/prompts';
import { parseGeneratedEtsyListing } from '@/lib/validation/generated';

const MAX_LISTING_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nicheId, productTypeId, productName, settings } = body as {
      nicheId: string; productTypeId: string; productName: string; settings?: AISettings;
    };
    const prompt = getEtsyListingPrompt(nicheId, productTypeId, productName);
    let lastError = 'Failed to generate Etsy listing.';
    let lastIssues: string[] = [];
    for (let attempt = 1; attempt <= MAX_LISTING_ATTEMPTS; attempt += 1) {
      const raw = await generateContent(prompt, settings, 'listing');
      const parsed = parseGeneratedEtsyListing(raw);

      if (parsed.success) {
        return NextResponse.json({ listing: parsed.data, warnings: parsed.warnings });
      }

      lastError = parsed.error || 'Generated listing is invalid.';
      lastIssues = parsed.issues;
    }

    return NextResponse.json(
      { error: lastError, details: lastIssues },
      { status: 422 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
