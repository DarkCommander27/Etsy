import { NextRequest, NextResponse } from 'next/server';
import { generateContent, AIProviderError, AISettings } from '@/lib/ai/client';
import { getEtsyListingPrompt } from '@/lib/ai/prompts';
import { parseGeneratedEtsyListing, validateEtsyListingGenerationRequest } from '@/lib/validation/generated';
import { getEtsyCategoryForProduct } from '@/lib/etsy/categories';

const MAX_LISTING_ATTEMPTS = 8;

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const rawBody = body && typeof body === 'object' ? body as Record<string, unknown> : {};
    const requestValidation = validateEtsyListingGenerationRequest(body);

    if (!requestValidation.success || !requestValidation.data) {
      return NextResponse.json(
        { error: requestValidation.error, details: requestValidation.issues },
        { status: 400 }
      );
    }

    const { nicheId, productTypeId, productName } = requestValidation.data;
    const settings = rawBody.settings && typeof rawBody.settings === 'object' ? rawBody.settings as AISettings : undefined;
    const pageSize = typeof rawBody.pageSize === 'string' ? rawBody.pageSize : undefined;
    const categoryInfo = getEtsyCategoryForProduct(nicheId, productTypeId, productName);
    let lastError = 'Failed to generate Etsy listing.';
    let lastIssues: string[] = [];
    for (let attempt = 1; attempt <= MAX_LISTING_ATTEMPTS; attempt += 1) {
      // Re-call getEtsyListingPrompt on every attempt — it randomly rotates the keyword
      // set, so retries get genuinely different angles rather than banging on one prompt.
      const prompt = getEtsyListingPrompt(nicheId, productTypeId, productName, pageSize);
      const retryNote = lastIssues.length && attempt > 1
        ? `\n\nPrevious attempt issues to fix:\n${lastIssues.slice(0, 6).map((i) => `- ${i}`).join('\n')}\n\nFix all listed issues while keeping the same JSON shape.`
        : '';
      const raw = await generateContent(prompt + retryNote, settings, 'listing');
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
