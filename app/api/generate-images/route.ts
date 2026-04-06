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
    console.error('[generate-images] error:', err);
    // Surface the correct HTTP status for rate-limits / auth so the UI can
    // show a meaningful message instead of a generic "server error".
    let status = 500;
    if ((err as { status?: number }).status === 429 || msg.includes('429') || /rate.?limit/i.test(msg)) {
      status = 429;
    } else if ((err as { status?: number }).status === 401 || /invalid.{0,30}api.{0,10}key|api key/i.test(msg)) {
      status = 401;
    }
    return NextResponse.json({ error: msg }, { status });
  }
}
