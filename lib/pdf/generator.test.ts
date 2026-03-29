import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib/cjs';
import { generatePDF } from './generator';

describe('generatePDF layout safety', () => {
  it('generates a valid PDF for dense content without throwing', async () => {
    const bytes = await generatePDF({
      pageSize: 'letter',
      colorScheme: {
        background: '#FFFFFF',
        primary: '#2563EB',
        secondary: '#DBEAFE',
        text: '#111827',
        accent: '#60A5FA',
      },
      title: 'Very Long High Utility Worksheet Title For Layout Validation',
      nicheId: 'adhd',
      productTypeId: 'daily-planner',
      content: {
        title: 'Very Long High Utility Worksheet Title For Layout Validation',
        subtitle: 'A dense subtitle that would usually overflow if wrapping and page fit checks were not in place',
        top_3_priorities: [
          'Long priority line one with enough words to require wrapping in narrow widths',
          'Long priority line two with enough words to require wrapping in narrow widths',
          'Long priority line three with enough words to require wrapping in narrow widths',
        ],
        sections: Array.from({ length: 8 }).map((_, i) => ({
          name: `Section ${i + 1} with a long heading`,
          description: 'desc',
          items: Array.from({ length: 6 }).map((__, j) => `Item ${j + 1} with long descriptive text to test wrapping and row spacing`),
        })),
        prompts: Array.from({ length: 6 }).map((_, i) => `Prompt ${i + 1}: explain your plan in detail using complete sentences and practical action steps.`),
        affirmation: 'You are building a robust printable workflow and every iteration improves output quality.',
      },
    });

    expect(bytes.length).toBeGreaterThan(500);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
  });
});
