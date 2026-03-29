import { NextRequest, NextResponse } from 'next/server';
import { generateAndStoreListingImages } from '@/lib/images/mockup';
import { validateListingImageRequest } from '@/lib/validation/generated';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
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

    const result = await generateAndStoreListingImages(validated.data);
    return NextResponse.json({ images: result.images, warnings: result.warnings });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
