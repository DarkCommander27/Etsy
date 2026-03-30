import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), 'output');

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

export interface OutputFolderParams {
  title: string;
  nicheId: string;
  productTypeId: string;
  pdfBytes: Uint8Array;
  content?: Record<string, unknown> | null;
  listing?: {
    title?: string;
    description?: string;
    tags?: string[];
    category?: string;
    taxonomyId?: number;
  } | null;
}

/**
 * Saves a product's PDF and listing details to output/<slug>-<ts>/.
 * Returns the folder path that was created.
 */
export function saveOutputFolder(params: OutputFolderParams): string {
  ensureOutputDir();

  const ts = Date.now();
  const slug = slugify(params.title || params.productTypeId || 'product');
  const folderName = `${slug}-${ts}`;
  const folderPath = path.join(OUTPUT_DIR, folderName);
  fs.mkdirSync(folderPath, { recursive: true });

  // 1 — PDF
  const pdfFilename = `${slug}.pdf`;
  fs.writeFileSync(path.join(folderPath, pdfFilename), Buffer.from(params.pdfBytes));

  // 2 — Listing details JSON
  const details: Record<string, unknown> = {
    generatedAt: new Date(ts).toISOString(),
    nicheId: params.nicheId,
    productTypeId: params.productTypeId,
    title: params.title,
  };
  if (params.listing) {
    details.etsyTitle = params.listing.title;
    details.etsyDescription = params.listing.description;
    details.etsyTags = params.listing.tags;
    details.etsyCategory = params.listing.category;
    details.etsyTaxonomyId = params.listing.taxonomyId;
  }
  if (params.content) {
    details.content = params.content;
  }
  fs.writeFileSync(
    path.join(folderPath, 'listing.json'),
    JSON.stringify(details, null, 2),
  );

  return folderPath;
}
