import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib/cjs';
import { generatePDF, PDFOptions } from '@/lib/pdf/generator';
import { readRequestJson } from '@/lib/utils';
import { validateProductContent } from '@/lib/validation/generated';

const MAX_BUNDLE_ITEMS = 8;

const DEFAULT_COLOR_SCHEME: PDFOptions['colorScheme'] = {
  background: '#FFFFFF',
  primary: '#2563EB',
  secondary: '#DBEAFE',
  text: '#111827',
  accent: '#60A5FA',
};

interface BundleItem {
  nicheId: string;
  productTypeId: string;
  title: string;
  colorScheme?: PDFOptions['colorScheme'];
  pageSize?: PDFOptions['pageSize'];
  content: unknown;
}

function isBundleItem(value: unknown): value is BundleItem {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.nicheId === 'string' && typeof v.productTypeId === 'string' &&
    typeof v.title === 'string' && v.content !== undefined;
}

export async function POST(req: NextRequest) {
  const parsedBody = await readRequestJson<unknown>(req);
  if (!parsedBody.ok) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const body = parsedBody.data as Record<string, unknown>;
  const items = body?.items;
  const bundleTitle = typeof body?.bundleTitle === 'string' && body.bundleTitle.trim()
    ? body.bundleTitle.trim()
    : 'Bundle';

  if (!Array.isArray(items) || items.length < 2) {
    return NextResponse.json({ error: 'Bundle requires at least 2 items.' }, { status: 400 });
  }

  if (items.length > MAX_BUNDLE_ITEMS) {
    return NextResponse.json({ error: `Bundle is limited to ${MAX_BUNDLE_ITEMS} items.` }, { status: 400 });
  }

  const validItems = items.filter(isBundleItem);
  if (validItems.length !== items.length) {
    return NextResponse.json({ error: 'Each bundle item must have nicheId, productTypeId, title, and content.' }, { status: 400 });
  }

  try {
    const mergedDoc = await PDFDocument.create();

    for (const item of validItems) {
      const validated = validateProductContent(item.content);
      if (!validated.success || !validated.data) {
        return NextResponse.json(
          { error: `Invalid content for "${item.title}": ${validated.error}` },
          { status: 422 }
        );
      }

      const options: PDFOptions = {
        pageSize: item.pageSize || 'letter',
        colorScheme: item.colorScheme || DEFAULT_COLOR_SCHEME,
        title: item.title,
        nicheId: item.nicheId,
        productTypeId: item.productTypeId,
        content: validated.data,
      };

      const pdfBytes = await generatePDF(options);
      const srcDoc = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
      for (const page of copiedPages) {
        mergedDoc.addPage(page);
      }
    }

    const mergedBytes = await mergedDoc.save();
    const safeTitle = bundleTitle.replace(/[^a-z0-9]/gi, '-');

    return new NextResponse(Buffer.from(mergedBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeTitle}-bundle.pdf"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
