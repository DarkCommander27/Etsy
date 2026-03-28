import { NextRequest, NextResponse } from 'next/server';
import { generateContent, AISettings } from '@/lib/ai/client';
import { getContentPrompt } from '@/lib/ai/prompts';
import { validateContent, QualityCheck } from '@/lib/ai/quality';

const MAX_RETRIES = 2;
const RETRY_TEMPERATURES = [0.7, 0.5, 0.9]; // Try different creativity levels

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nicheId, productTypeId, customTitle, settings } = body as {
      nicheId: string; productTypeId: string; customTitle?: string; settings?: AISettings;
    };

    const prompt = getContentPrompt(nicheId, productTypeId, customTitle);

    let bestContent: Record<string, unknown> | null = null;
    let bestQuality: QualityCheck | null = null;
    const attemptDetails: Array<{ attempt: number; score: number; issues: string[] }> = [];

    // Try multiple times with different temperatures if quality is low
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const temperature = RETRY_TEMPERATURES[attempt] || 0.7;

      try {
        const raw = await generateContent(prompt, settings, temperature);
        let content: Record<string, unknown>;

        try {
          const match = raw.match(/\{[\s\S]*\}/);
          if (match) {
            content = JSON.parse(match[0]);
          } else {
            content = { title: customTitle || productTypeId, raw };
          }
        } catch {
          content = { title: customTitle || productTypeId, raw };
        }

        // Validate content quality
        const quality = validateContent(content, nicheId);

        attemptDetails.push({
          attempt: attempt + 1,
          score: quality.score,
          issues: quality.issues,
        });

        // Keep track of best result
        if (!bestContent || !bestQuality || quality.score > bestQuality.score) {
          bestContent = content;
          bestQuality = quality;
        }

        // If we got high quality content, stop trying
        if (quality.passed && quality.score >= 85) {
          break;
        }

        // If this is not the last attempt, continue
        if (attempt < MAX_RETRIES && !quality.passed) {
          console.log(`Attempt ${attempt + 1} score: ${quality.score}, retrying with temperature ${RETRY_TEMPERATURES[attempt + 1]}`);
          continue;
        }
      } catch (parseError) {
        console.error(`Attempt ${attempt + 1} failed:`, parseError);
        if (attempt === MAX_RETRIES) {
          throw parseError;
        }
      }
    }

    if (!bestContent || !bestQuality) {
      throw new Error('Failed to generate valid content after multiple attempts');
    }

    return NextResponse.json({
      content: bestContent,
      quality: {
        score: bestQuality.score,
        passed: bestQuality.passed,
        issues: bestQuality.issues,
        warnings: bestQuality.warnings,
      },
      attempts: attemptDetails,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
