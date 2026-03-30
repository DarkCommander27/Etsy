import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createListing, uploadListingFile, uploadListingImage } from '@/lib/etsy/client';
import { generatePDF, PDFOptions } from '@/lib/pdf/generator';
import { saveOutputFolder } from '@/lib/output';
import { PRODUCT_QUALITY_MIN_SCORE, evaluateNichePublishChecklist, evaluateProductQuality, validateEtsyListing, validateListingImageMeta, validateProductContent } from '@/lib/validation/generated';

const DATA_DIR = path.join(process.cwd(), 'data');
const IDEMPOTENCY_FILE = path.join(DATA_DIR, 'publish-idempotency.json');
const IDEMPOTENCY_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const IDEMPOTENCY_MAX_ENTRIES = 2000;

type IdempotencyStore = Record<string, {
  listing_id: number;
  createdAt: string;
}>;

function readIdempotencyStore(): IdempotencyStore {
  try {
    if (!fs.existsSync(IDEMPOTENCY_FILE)) return {};
    const parsed = JSON.parse(fs.readFileSync(IDEMPOTENCY_FILE, 'utf-8')) as IdempotencyStore;
    const now = Date.now();
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => {
        const ts = Date.parse(value.createdAt);
        return Number.isFinite(ts) && now - ts <= IDEMPOTENCY_TTL_MS;
      })
    );
  } catch {
    return {};
  }
}

function writeIdempotencyStore(store: IdempotencyStore) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const entries = Object.entries(store)
    .sort((a, b) => Date.parse(b[1].createdAt) - Date.parse(a[1].createdAt))
    .slice(0, IDEMPOTENCY_MAX_ENTRIES);
  fs.writeFileSync(IDEMPOTENCY_FILE, JSON.stringify(Object.fromEntries(entries), null, 2));
}

function resolvePublicPath(url: string): string | null {
  if (!url.startsWith('/')) return null;
  const cleaned = url.replace(/^\/+/, '');
  const candidate = path.join(process.cwd(), 'public', cleaned);
  const normalized = path.normalize(candidate);
  const publicRoot = path.normalize(path.join(process.cwd(), 'public'));
  if (!normalized.startsWith(publicRoot)) return null;
  return normalized;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
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
    };
    const { title, description, tags, taxonomyId, price, shopId, idempotencyKey, pdfOptions, listingImages } = body;
    const publishWarnings: string[] = [];

    if (idempotencyKey && idempotencyKey.trim().length >= 8) {
      const store = readIdempotencyStore();
      const existing = store[idempotencyKey];
      if (existing) {
        return NextResponse.json({
          listing: { listing_id: existing.listing_id },
          warnings: ['Returned existing draft from idempotency cache to avoid duplicate publish.'],
          idempotent: true,
        });
      }
    }

    const effectiveApiKey = process.env.ETSY_API_KEY || '';
    if (!effectiveApiKey) {
      return NextResponse.json({ error: 'Etsy API key not configured. Add ETSY_API_KEY to .env.local.' }, { status: 400 });
    }
    if (!shopId) {
      return NextResponse.json({ error: 'Etsy Shop ID not configured. Add it in Settings.' }, { status: 400 });
    }

    const listingValidation = validateEtsyListing({ title, description, tags }, { requireAllTags: true });
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

    const listing = await createListing({
      shopId,
      apiKey: effectiveApiKey,
      title: listingData.title,
      description: listingData.description,
      tags: listingData.tags,
      taxonomyId: Number.isInteger(taxonomyId) ? taxonomyId : undefined,
      price: parseFloat(String(price)) || 5.0,
    });

    // If PDF options provided, generate and upload the file automatically
    if (pdfOptions && listing.listing_id) {
      try {
        const pdfBytes = await generatePDF(pdfOptions);
        const filename = `${listingData.title.replace(/[^a-z0-9]/gi, '-').substring(0, 50)}.pdf`;
        await uploadListingFile(shopId, listing.listing_id, effectiveApiKey, pdfBytes, filename);
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
      } catch (uploadErr) {
        return NextResponse.json({
          listing,
          warnings: listingValidation.warnings,
          warning: `Draft created, but PDF upload failed: ${uploadErr instanceof Error ? uploadErr.message : 'Unknown error'}. Please upload the PDF manually on Etsy.`,
        });
      }
    }

    if (listing.listing_id && Array.isArray(listingImages) && listingImages.length > 0) {
      for (const image of [...listingImages].sort((a, b) => a.rank - b.rank).slice(0, 5)) {
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

    if (idempotencyKey && idempotencyKey.trim().length >= 8 && listing.listing_id) {
      const store = readIdempotencyStore();
      store[idempotencyKey] = {
        listing_id: listing.listing_id,
        createdAt: new Date().toISOString(),
      };
      writeIdempotencyStore(store);
    }

    return NextResponse.json({ listing, warnings: [...listingValidation.warnings, ...publishWarnings] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
