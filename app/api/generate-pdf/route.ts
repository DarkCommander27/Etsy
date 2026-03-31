import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { generatePDF, PDFOptions } from '@/lib/pdf/generator';
import { addHistoryEntry } from '@/lib/db';
import { validateProductContent } from '@/lib/validation/generated';
import { saveOutputFolder } from '@/lib/output';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
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
    const validated = validateProductContent(content);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error, details: validated.issues }, { status: 422 });
    }
    if (!validated.data) {
      return NextResponse.json({ error: 'Validated PDF content was unexpectedly empty.' }, { status: 500 });
    }
    const options: PDFOptions = {
      pageSize: pageSize || 'letter',
      colorScheme,
      title,
      nicheId,
      productTypeId,
      content: validated.data,
    };
    const pdfBytes = await generatePDF(options);
    try {
      await addHistoryEntry({
        id: crypto.randomUUID(), nicheId, productTypeId, title,
        colorScheme: colorScheme?.id || 'default', pageSize: pageSize || 'letter',
        createdAt: new Date().toISOString(),
      });
    } catch {
      // History write failure should never block the PDF response
    }
    try {
      saveOutputFolder({
        title: title || productTypeId,
        nicheId,
        productTypeId,
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
