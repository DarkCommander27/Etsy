import { NextRequest, NextResponse } from 'next/server';
import { generateContent, AIProviderError, AISettings } from '@/lib/ai/client';
import { ContentQualityTemplateId, getContentPrompt } from '@/lib/ai/prompts';
import { evaluateProductQuality, parseGeneratedProductContent, PRODUCT_QUALITY_MIN_SCORE } from '@/lib/validation/generated';

const MAX_GENERATION_ATTEMPTS = 8;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nicheId, productTypeId, customTitle, settings, qualityTemplateId } = body as {
      nicheId: string;
      productTypeId: string;
      customTitle?: string;
      settings?: AISettings;
      qualityTemplateId?: ContentQualityTemplateId;
    };
    const template = qualityTemplateId === 'best-quality' ? 'best-quality' : 'default';
    const prompt = getContentPrompt(nicheId, productTypeId, customTitle, template);
    let bestCandidate: {
      content: Record<string, unknown>;
      warnings: string[];
      qualityScore: number;
      qualityIssues: string[];
    } | null = null;
    let lastIssues: string[] = [];
    let lastError = 'Failed to generate quality content.';

    for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
      const raw = await generateContent(prompt, settings, 'product');
      const parsed = parseGeneratedProductContent(raw);

      if (!parsed.success || !parsed.data) {
        lastIssues = parsed.issues;
        lastError = parsed.error || 'Generated content is invalid.';
        continue;
      }

      const quality = evaluateProductQuality(parsed.data);
      const candidate = {
        content: parsed.data,
        warnings: parsed.warnings,
        qualityScore: quality.score,
        qualityIssues: quality.issues,
      };

      if (!bestCandidate || candidate.qualityScore > bestCandidate.qualityScore) {
        bestCandidate = candidate;
      }

      if (quality.score >= PRODUCT_QUALITY_MIN_SCORE) {
        return NextResponse.json(candidate);
      }

      lastIssues = quality.issues;
      lastError = `Generated content quality score ${quality.score}/100 was below threshold (${PRODUCT_QUALITY_MIN_SCORE}/100).`;
    }

    return NextResponse.json(
      {
        error: lastError,
        details: lastIssues,
        bestCandidate,
      },
      { status: 422 }
    );
  } catch (err) {
    if (err instanceof AIProviderError) {
      return NextResponse.json(
        {
          error: err.message,
          provider: err.provider,
          model: err.model,
        },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 }
      );
    }
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
