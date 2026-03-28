import { NextRequest, NextResponse } from 'next/server';
import { createListing, uploadListingFile } from '@/lib/etsy/client';
import { generatePDF, PDFOptions } from '@/lib/pdf/generator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      title: string;
      description: string;
      tags: string[];
      price: number;
      shopId: string;
      apiKey?: string;
      pdfOptions?: PDFOptions;
    };
    const { title, description, tags, price, shopId, apiKey, pdfOptions } = body;

    const effectiveApiKey = apiKey || process.env.ETSY_API_KEY || '';
    if (!effectiveApiKey) {
      return NextResponse.json({ error: 'Etsy API key not configured. Add ETSY_API_KEY to .env.local.' }, { status: 400 });
    }
    if (!shopId) {
      return NextResponse.json({ error: 'Etsy Shop ID not configured. Add it in Settings.' }, { status: 400 });
    }

    const listing = await createListing({
      shopId,
      apiKey: effectiveApiKey,
      title,
      description,
      tags,
      price: parseFloat(String(price)) || 5.0,
    });

    // If PDF options provided, generate and upload the file automatically
    if (pdfOptions && listing.listing_id) {
      try {
        const pdfBytes = await generatePDF(pdfOptions);
        const filename = `${title.replace(/[^a-z0-9]/gi, '-').substring(0, 50)}.pdf`;
        await uploadListingFile(shopId, listing.listing_id, effectiveApiKey, pdfBytes, filename);
      } catch (uploadErr) {
        return NextResponse.json({
          listing,
          warning: `Draft created, but PDF upload failed: ${uploadErr instanceof Error ? uploadErr.message : 'Unknown error'}. Please upload the PDF manually on Etsy.`,
        });
      }
    }

    return NextResponse.json({ listing });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
