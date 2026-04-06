import { NextRequest, NextResponse } from 'next/server';
import { generateProductNameIdeas } from '@/lib/etsy/titleSuggestions';
import { getNicheById, getProductById } from '@/lib/niches';
import { readRequestJson } from '@/lib/utils';
import { validateProductSelectionRequest } from '@/lib/validation/generated';

export async function POST(req: NextRequest) {
  const parsedBody = await readRequestJson<unknown>(req);
  if (!parsedBody.ok) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const body: unknown = parsedBody.data;
    const rawBody = body && typeof body === 'object' ? body as Record<string, unknown> : {};
    const requestValidation = validateProductSelectionRequest(body);
    const nicheId = requestValidation.data?.nicheId;
    const productTypeId = requestValidation.data?.productTypeId;
    const customTitle = typeof rawBody.customTitle === 'string' && rawBody.customTitle.trim()
      ? rawBody.customTitle.trim()
      : undefined;

    if (!requestValidation.success || !nicheId || !productTypeId) {
      return NextResponse.json(
        { error: requestValidation.error, details: requestValidation.issues },
        { status: 400 }
      );
    }

    const niche = getNicheById(nicheId);
    const product = getProductById(nicheId, productTypeId);

    if (!niche || !product) {
      return NextResponse.json(
        { error: 'Invalid nicheId or productTypeId.' },
        { status: 400 }
      );
    }

    const ideas = generateProductNameIdeas({
      nicheId,
      productTypeId,
      customTitle,
      limit: 8,
    });

    return NextResponse.json({
      ideas,
      context: {
        niche: niche.name,
        product: product.name,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
