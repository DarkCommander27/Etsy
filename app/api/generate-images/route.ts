import { NextRequest, NextResponse } from 'next/server';
import { generateAndStoreListingImages } from '@/lib/images/mockup';
import { readRequestJson } from '@/lib/utils';
import { validateListingImageRequest } from '@/lib/validation/generated';

export async function POST(req: NextRequest) {
  const parsedBody = await readRequestJson<unknown>(req);
  if (!parsedBody.ok) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const body = parsedBody.data;
    const validated = validateListingImageRequest(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error, details: validated.issues },
        { status: 422 }
      );
    }
    if (!validated.data) {
      return NextResponse.json({ error: 'Validated image request was unexpectedly empty.' }, { status: 500 });
    }

    const apiKey = validated.data.settings?.openaiApiKey || process.env.OPENAI_API_KEY || '';
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is required to generate listing images. Add it in Settings → OpenAI API Key.' },
        { status: 400 }
      );
    }

    const result = await generateAndStoreListingImages(validated.data);
    return NextResponse.json({ images: result.images, warnings: result.warnings, provider: result.provider });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[generate-images] 500 error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
