import { NextRequest, NextResponse } from 'next/server';
import { generateContent, AIProviderError, AISettings } from '@/lib/ai/client';
import { getEtsyListingPrompt } from '@/lib/ai/prompts';
import { parseGeneratedEtsyListing } from '@/lib/validation/generated';
import { getEtsyCategoryForProduct } from '@/lib/etsy/categories';

const MAX_LISTING_ATTEMPTS = 8;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nicheId, productTypeId, productName, settings } = body as {
      nicheId: string; productTypeId: string; productName: string; settings?: AISettings;
    };
    const prompt = getEtsyListingPrompt(nicheId, productTypeId, productName);
    const categoryInfo = getEtsyCategoryForProduct(nicheId, productTypeId, productName);
    let lastError = 'Failed to generate Etsy listing.';
    let lastIssues: string[] = [];
    for (let attempt = 1; attempt <= MAX_LISTING_ATTEMPTS; attempt += 1) {
      const raw = await generateContent(prompt, settings, 'listing');
      const parsed = parseGeneratedEtsyListing(raw);

      if (parsed.success) {
        return NextResponse.json({
          listing: {
            ...parsed.data,
            category: categoryInfo.path,
            taxonomyId: categoryInfo.taxonomyId,
          },
          warnings: parsed.warnings,
        });
      }

      lastError = parsed.error || 'Generated listing is invalid.';
      lastIssues = parsed.issues;
    }

    return NextResponse.json(
      { error: lastError, details: lastIssues },
      { status: 422 }
    );
  } catch (err) {
    if (err instanceof AIProviderError) {
      return NextResponse.json(
        {
          error: err.message,
          provider: err.provider,
          model: err.model,
        },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 }
      );
    }
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
