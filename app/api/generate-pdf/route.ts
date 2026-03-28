import { NextRequest, NextResponse } from 'next/server';
import { generatePDF, PDFOptions } from '@/lib/pdf/generator';
import { addHistoryEntry } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nicheId, productTypeId, title, colorScheme, pageSize, content } = body;
    const options: PDFOptions = { pageSize: pageSize || 'letter', colorScheme, title, nicheId, productTypeId, content };
    const pdfBytes = await generatePDF(options);
    addHistoryEntry({
      id: Date.now().toString(), nicheId, productTypeId, title,
      colorScheme: colorScheme?.id || 'default', pageSize: pageSize || 'letter',
      createdAt: new Date().toISOString(),
    });
    const safeTitle = (title || 'document').replace(/[^a-z0-9]/gi, '-');
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${safeTitle}.pdf"` },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
