import { NextRequest, NextResponse } from 'next/server';
import { generateContent, AIProviderError, AISettings } from '@/lib/ai/client';
import { ContentQualityTemplateId, ContentVariationId, getContentPrompt } from '@/lib/ai/prompts';
import { applyContentQualityRepairs, evaluateProductQuality, parseGeneratedProductContent, PRODUCT_QUALITY_MIN_SCORE, validateProductSelectionRequest } from '@/lib/validation/generated';

const MAX_GENERATION_ATTEMPTS = 8;

function buildQualityRetryPrompt(basePrompt: string, issues: string[], attempt: number): string {
  if (!issues.length || attempt <= 1) return basePrompt;

  const issueLines = issues.slice(0, 8).map((issue) => `- ${issue}`).join('\n');
  return `${basePrompt}

Previous attempt quality gaps to fix now:
${issueLines}

IMPORTANT: Do not rephrase or slightly adjust the previous output. Write completely new, specific content from scratch. Every item, prompt, or instruction must be independently useful — a real buyer should know exactly what to write or do without needing to ask "what do you mean?". Bare labels like "Win #1:", "Task:", or "Step 2: ___" are not acceptable. Replace every placeholder with a complete, concrete prompt or instruction. Preserve the same JSON shape and product intent.`;
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const rawBody = body && typeof body === 'object' ? body as Record<string, unknown> : {};
    const selection = validateProductSelectionRequest(body);

    if (!selection.success || !selection.data) {
      return NextResponse.json(
        { error: selection.error, details: selection.issues },
        { status: 400 }
      );
    }

    const { nicheId, productTypeId, customTitle } = selection.data;
    const settings = rawBody.settings && typeof rawBody.settings === 'object' ? rawBody.settings as AISettings : undefined;
    const qualityTemplateId = rawBody.qualityTemplateId as ContentQualityTemplateId | undefined;
    const variationId = rawBody.variationId as ContentVariationId | undefined;
    const template = qualityTemplateId === 'best-quality' ? 'best-quality' : 'default';
    const prompt = getContentPrompt(nicheId, productTypeId, customTitle, template, variationId ?? 'standard');
    let bestCandidate: {
      content: Record<string, unknown>;
      warnings: string[];
      qualityScore: number;
      qualityIssues: string[];
    } | null = null;
    let lastIssues: string[] = [];
    let lastError = 'Failed to generate quality content.';

    for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
      const attemptPrompt = buildQualityRetryPrompt(prompt, lastIssues, attempt);
      const raw = await generateContent(attemptPrompt, settings, 'product');
      const parsed = parseGeneratedProductContent(raw);

      if (!parsed.success || !parsed.data) {
        lastIssues = parsed.issues;
        lastError = parsed.error || 'Generated content is invalid.';
        continue;
      }

      const repairedContent = applyContentQualityRepairs(parsed.data);
      const quality = evaluateProductQuality(repairedContent);
      const candidate = {
        content: repairedContent,
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
