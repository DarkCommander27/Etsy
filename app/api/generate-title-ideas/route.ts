import { NextRequest, NextResponse } from 'next/server';
import { generateProductNameIdeas } from '@/lib/etsy/titleSuggestions';
import { getNicheById, getProductById } from '@/lib/niches';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nicheId, productTypeId, customTitle } = body as {
      nicheId?: string;
      productTypeId?: string;
      customTitle?: string;
    };

    if (!nicheId || !productTypeId) {
      return NextResponse.json(
        { error: 'nicheId and productTypeId are required.' },
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
