import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { generatePDF, PDFOptions } from '@/lib/pdf/generator';
import { addHistoryEntry } from '@/lib/db';
import { readRequestJson } from '@/lib/utils';
import { validateProductContent, validateProductSelectionRequest } from '@/lib/validation/generated';
import { saveOutputFolder } from '@/lib/output';

const DEFAULT_COLOR_SCHEME: PDFOptions['colorScheme'] = {
  background: '#FFFFFF',
  primary: '#2563EB',
  secondary: '#DBEAFE',
  text: '#111827',
  accent: '#60A5FA',
};

export async function POST(req: NextRequest) {
  const parsedBody = await readRequestJson<{
    nicheId?: string;
    productTypeId?: string;
    title?: string;
    colorScheme?: PDFOptions['colorScheme'];
    pageSize?: PDFOptions['pageSize'];
    content?: unknown;
  }>(req);
  if (!parsedBody.ok) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const body = parsedBody.data;
    const { nicheId, productTypeId, title, colorScheme, pageSize, content } = body;

    // Basic type validation for metadata fields
    if (nicheId !== undefined && typeof nicheId !== 'string') {
      return NextResponse.json({ error: 'nicheId must be a string.' }, { status: 400 });
    }
    if (productTypeId !== undefined && typeof productTypeId !== 'string') {
      return NextResponse.json({ error: 'productTypeId must be a string.' }, { status: 400 });
    }
    if (title !== undefined && (typeof title !== 'string' || title.length > 500)) {
      return NextResponse.json({ error: 'title must be a string under 500 characters.' }, { status: 400 });
    }

    const selection = validateProductSelectionRequest({ nicheId, productTypeId });
    if (!selection.success || !selection.data) {
      return NextResponse.json(
        { error: selection.error, details: selection.issues },
        { status: 400 }
      );
    }

    const resolvedNicheId = selection.data.nicheId;
    const resolvedProductTypeId = selection.data.productTypeId;
    const resolvedTitle = typeof title === 'string' && title.trim()
      ? title.trim()
      : typeof content === 'object' && content && typeof (content as Record<string, unknown>).title === 'string'
        ? String((content as Record<string, unknown>).title).trim()
        : resolvedProductTypeId;
    const resolvedColorScheme = colorScheme || DEFAULT_COLOR_SCHEME;
    const resolvedPageSize = pageSize || 'letter';

    const validated = validateProductContent(content);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error, details: validated.issues }, { status: 422 });
    }
    if (!validated.data) {
      return NextResponse.json({ error: 'Validated PDF content was unexpectedly empty.' }, { status: 500 });
    }
    const options: PDFOptions = {
      pageSize: resolvedPageSize,
      colorScheme: resolvedColorScheme,
      title: resolvedTitle,
      nicheId: resolvedNicheId,
      productTypeId: resolvedProductTypeId,
      content: validated.data,
    };
    const pdfBytes = await generatePDF(options);
    try {
      await addHistoryEntry({
        id: crypto.randomUUID(), nicheId: resolvedNicheId, productTypeId: resolvedProductTypeId, title: resolvedTitle,
        colorScheme: resolvedColorScheme.id || 'default', pageSize: resolvedPageSize,
        createdAt: new Date().toISOString(),
        content: validated.data,
      });
    } catch {
      // History write failure should never block the PDF response
    }
    try {
      saveOutputFolder({
        title: resolvedTitle,
        nicheId: resolvedNicheId,
        productTypeId: resolvedProductTypeId,
        pdfBytes,
        content: validated.data as Record<string, unknown>,
      });
    } catch {
      // Output folder save is best-effort — never block the PDF response
    }
    const safeTitle = (title || 'document').replace(/[^a-z0-9]/gi, '-');
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${safeTitle}.pdf"` },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
