import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createListing, getConfiguredEtsyApiKey, uploadListingFile, uploadListingImage } from '@/lib/etsy/client';
import { generatePDF, PDFOptions } from '@/lib/pdf/generator';
import { saveOutputFolder } from '@/lib/output';
import { claimPublishIdempotency, completePublishIdempotency, releasePublishIdempotency } from '@/lib/storage';
import { readRequestJson } from '@/lib/utils';
import { PRODUCT_QUALITY_MIN_SCORE, STRICT_ETSY_LISTING_VALIDATION, evaluateNichePublishChecklist, evaluateProductQuality, validateEtsyListing, validateListingImageMeta, validateListingTitleAgainstReference, validateProductContent } from '@/lib/validation/generated';

const IDEMPOTENCY_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const IDEMPOTENCY_MAX_ENTRIES = 2000;
const IDEMPOTENCY_IN_PROGRESS_TTL_MS = 10 * 60 * 1000;

function resolvePublicPath(url: string): string | null {
  if (!url.startsWith('/')) return null;
  const cleaned = url.replace(/^\/+/, '');
  const candidate = path.join(process.cwd(), 'public', cleaned);
  const normalized = path.normalize(candidate);
  const publicRoot = path.normalize(path.join(process.cwd(), 'public'));
  if (!normalized.startsWith(publicRoot + path.sep)) return null;
  return normalized;
}

export async function POST(req: NextRequest) {
  let claimedIdempotencyKey: string | null = null;

  const parsedBody = await readRequestJson<{
    title: string;
    description: string;
    tags: string[];
    taxonomyId?: number;
    price: number;
    shopId: string;
    idempotencyKey?: string;
    pdfOptions?: PDFOptions;
    listingImages?: Array<{
      id: string;
      rank: number;
      filename: string;
      url: string;
      width: number;
      height: number;
      prompt: string;
      createdAt: string;
    }>;
  }>(req);
  if (!parsedBody.ok) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const body = parsedBody.data;
    const { title, description, tags, taxonomyId, price, shopId, idempotencyKey, pdfOptions, listingImages } = body;
    const publishWarnings: string[] = [];
    const normalizedIdempotencyKey = typeof idempotencyKey === 'string' ? idempotencyKey.trim() : '';

    const effectiveApiKey = getConfiguredEtsyApiKey();
    if (!effectiveApiKey) {
      return NextResponse.json({ error: 'Etsy API key not configured. Save it in Settings or add ETSY_API_KEY to .env.local.' }, { status: 400 });
    }
    if (!shopId) {
      return NextResponse.json({ error: 'Etsy Shop ID not configured. Add it in Settings.' }, { status: 400 });
    }

    const listingValidation = validateEtsyListing({ title, description, tags }, STRICT_ETSY_LISTING_VALIDATION);
    if (!listingValidation.success) {
      return NextResponse.json(
        { error: listingValidation.error, details: listingValidation.issues, warnings: listingValidation.warnings },
        { status: 422 }
      );
    }
    if (!listingValidation.data) {
      return NextResponse.json({ error: 'Validated listing payload was unexpectedly empty.' }, { status: 500 });
    }
    const listingData = listingValidation.data;

    const referenceTitle = typeof pdfOptions?.content?.title === 'string' && pdfOptions.content.title.trim()
      ? pdfOptions.content.title.trim()
      : typeof pdfOptions?.title === 'string'
        ? pdfOptions.title.trim()
        : '';

    if (referenceTitle) {
      const titleIssues = validateListingTitleAgainstReference(listingData.title, referenceTitle);
      if (titleIssues.length > 0) {
        return NextResponse.json(
          { error: 'Listing title no longer matches the PDF/product title.', details: titleIssues, warnings: listingValidation.warnings },
          { status: 422 }
        );
      }
    }

    if (!Number.isFinite(Number(price)) || Number(price) < 0.2) {
      return NextResponse.json({ error: 'Price must be at least $0.20.' }, { status: 422 });
    }

    if (!Array.isArray(listingImages) || listingImages.length === 0) {
      return NextResponse.json(
        { error: 'No generated listing images found. Generate listing images after creating the PDF before publishing.' },
        { status: 422 }
      );
    }

    if (pdfOptions) {
      const contentValidation = validateProductContent(pdfOptions.content);
      if (!contentValidation.success) {
        return NextResponse.json(
          { error: contentValidation.error, details: contentValidation.issues },
          { status: 422 }
        );
      }
      if (!contentValidation.data) {
        return NextResponse.json({ error: 'Validated PDF content was unexpectedly empty.' }, { status: 500 });
      }
      const quality = evaluateProductQuality(contentValidation.data);
      if (quality.score < PRODUCT_QUALITY_MIN_SCORE) {
        return NextResponse.json(
          {
            error: `Product quality score ${quality.score}/100 is below publish threshold (${PRODUCT_QUALITY_MIN_SCORE}/100).`,
            details: quality.issues,
          },
          { status: 422 }
        );
      }

      const checklistIssues = evaluateNichePublishChecklist(
        String(pdfOptions.nicheId || ''),
        String(pdfOptions.productTypeId || ''),
        contentValidation.data
      );
      if (checklistIssues.length > 0) {
        return NextResponse.json(
          {
            error: 'Product failed niche-specific publish checklist. Improve content and retry.',
            details: checklistIssues,
          },
          { status: 422 }
        );
      }

      pdfOptions.content = contentValidation.data;
    }

    if (normalizedIdempotencyKey.length >= 8) {
      const idempotencyClaim = claimPublishIdempotency(
        normalizedIdempotencyKey,
        IDEMPOTENCY_TTL_MS,
        IDEMPOTENCY_IN_PROGRESS_TTL_MS
      );
      if (idempotencyClaim.status === 'completed') {
        return NextResponse.json({
          listing: { listing_id: idempotencyClaim.listing_id },
          warnings: ['Returned existing draft from idempotency cache to avoid duplicate publish.'],
          idempotent: true,
        });
      }

      if (idempotencyClaim.status === 'in-progress') {
        return NextResponse.json(
          { error: 'Publish already in progress for this idempotency key. Retry the same request in a few seconds.' },
          { status: 409 }
        );
      }

      claimedIdempotencyKey = normalizedIdempotencyKey;
    }

    const listing = await createListing({
      shopId,
      apiKey: effectiveApiKey,
      title: listingData.title,
      description: listingData.description,
      tags: listingData.tags,
      taxonomyId: Number.isInteger(taxonomyId) ? taxonomyId : undefined,
      price: parseFloat(String(price)) || 5.0,
    });

    if (claimedIdempotencyKey && listing.listing_id) {
      completePublishIdempotency(claimedIdempotencyKey, listing.listing_id, IDEMPOTENCY_TTL_MS, IDEMPOTENCY_MAX_ENTRIES);
    }

    // If PDF options provided, generate and upload the file automatically
    if (pdfOptions && listing.listing_id) {
      try {
        const pdfBytes = await generatePDF(pdfOptions);
        const filename = `${listingData.title.replace(/[^a-z0-9]/gi, '-').substring(0, 50)}.pdf`;
        try {
          await uploadListingFile(shopId, listing.listing_id, effectiveApiKey, pdfBytes, filename);
        } catch (uploadErr) {
          return NextResponse.json({
            listing,
            warnings: [...listingValidation.warnings, `Draft created, but PDF upload failed: ${uploadErr instanceof Error ? uploadErr.message : 'Unknown error'}. Please upload the PDF manually on Etsy.`],
          });
        }

        try {
          saveOutputFolder({
            title: String(pdfOptions.title || listingData.title || ''),
            nicheId: String(pdfOptions.nicheId || ''),
            productTypeId: String(pdfOptions.productTypeId || ''),
            pdfBytes,
            content: pdfOptions.content as Record<string, unknown>,
            listing: {
              title: listingData.title,
              description: listingData.description,
              tags: listingData.tags,
              taxonomyId: Number.isInteger(taxonomyId) ? (taxonomyId as number) : undefined,
            },
          });
        } catch { /* best-effort: output folder write should never block publish */ }
      } catch (pdfErr) {
        return NextResponse.json({
          listing,
          warnings: [...listingValidation.warnings, `Draft created, but PDF generation failed: ${pdfErr instanceof Error ? pdfErr.message : 'Unknown error'}. Generate the PDF again before uploading it to Etsy.`],
        });
      }
    }

    if (listing.listing_id && Array.isArray(listingImages) && listingImages.length > 0) {
      for (const image of [...listingImages].sort((a, b) => a.rank - b.rank).slice(0, 3)) {
        const validImage = validateListingImageMeta(image);
        if (!validImage.success || !validImage.data) {
          publishWarnings.push(`Skipped an invalid generated image payload for rank ${image?.rank || '?'}.`);
          continue;
        }

        const diskPath = resolvePublicPath(validImage.data.url);
        if (!diskPath || !fs.existsSync(diskPath)) {
          publishWarnings.push(`Image ${validImage.data.rank} is missing on disk and was not uploaded.`);
          continue;
        }

        try {
          const bytes = fs.readFileSync(diskPath);
          await uploadListingImage(
            shopId,
            listing.listing_id,
            effectiveApiKey,
            bytes,
            validImage.data.filename,
            validImage.data.rank
          );
        } catch (err) {
          publishWarnings.push(`Image ${validImage.data.rank} failed to upload: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    }

    return NextResponse.json({ listing, warnings: [...listingValidation.warnings, ...publishWarnings] });
  } catch (err) {
    if (claimedIdempotencyKey) {
      releasePublishIdempotency(claimedIdempotencyKey);
    }
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
