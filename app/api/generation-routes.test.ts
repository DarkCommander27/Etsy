import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
  mockGetContentPrompt: vi.fn(),
  mockGetEtsyListingPrompt: vi.fn(),
  mockGetEtsyCategoryForProduct: vi.fn(),
}));

vi.mock('@/lib/ai/client', () => ({
  generateContent: mocks.mockGenerateContent,
  AIProviderError: class MockAIProviderError extends Error {
    status: number;
    provider: string;
    model: string;

    constructor(message: string, status = 502, provider = 'mock', model = 'mock-model') {
      super(message);
      this.name = 'AIProviderError';
      this.status = status;
      this.provider = provider;
      this.model = model;
    }
  },
}));

vi.mock('@/lib/ai/prompts', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ai/prompts')>('@/lib/ai/prompts');
  return {
    ...actual,
    getContentPrompt: mocks.mockGetContentPrompt,
    getEtsyListingPrompt: mocks.mockGetEtsyListingPrompt,
  };
});

vi.mock('@/lib/etsy/categories', () => ({
  getEtsyCategoryForProduct: mocks.mockGetEtsyCategoryForProduct,
}));

import { POST as generateContentPost } from './generate-content/route';
import { POST as generateEtsyPost } from './generate-etsy/route';
import { POST as generatePdfPost } from './generate-pdf/route';
import { POST as generateTitleIdeasPost } from './generate-title-ideas/route';

const LISTING_TAGS = [
  'adhd planner',
  'daily planner',
  'printable pdf',
  'digital download',
  'focus planner',
  'productivity',
  'task organizer',
  'instant download',
  'planner page',
  'minimal planner',
  'adhd printable',
  'life organizer',
  'daily routine',
];

function buildStrictDescription(wordCount: number): string {
  const requiredWords = [
    'This',
    'ADHD',
    'daily',
    'planner',
    'printable',
    'is',
    'an',
    'instant',
    'digital',
    'download',
    'in',
    'PDF',
    'format',
    'for',
    'buyers',
    'who',
    'want',
    'calmer',
    'daily',
    'structure',
  ];

  if (wordCount < requiredWords.length) {
    throw new Error('wordCount is too small for the required Etsy description phrases.');
  }

  return [
    ...requiredWords,
    ...Array.from({ length: wordCount - requiredWords.length }, (_, index) => `detail${index}`),
  ].join(' ');
}

function buildListingJson(description: string): string {
  return JSON.stringify({
    title: 'ADHD Daily Planner Printable Digital Download',
    tags: LISTING_TAGS,
    description,
  });
}

function asNextRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe('generation route validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockGetContentPrompt.mockReturnValue('PROMPT');
    mocks.mockGetEtsyListingPrompt.mockReturnValue('LISTING PROMPT');
    mocks.mockGetEtsyCategoryForProduct.mockReturnValue({
      path: 'Paper & Party Supplies > Paper > Calendars & Planners',
      taxonomyId: 2078,
    });
  });

  it('retries generate-etsy when the first description misses the required word range', async () => {
    const shortDescription = buildStrictDescription(73);
    const shortListing = buildListingJson(shortDescription);
    const validDescription = buildStrictDescription(230);
    const validListing = buildListingJson(validDescription);
    mocks.mockGenerateContent
      .mockResolvedValueOnce(shortListing)
      .mockResolvedValueOnce(validListing);

    const response = await generateEtsyPost(
      asNextRequest({
        nicheId: 'adhd',
        productTypeId: 'daily-planner',
        productName: 'ADHD Daily Planner Printable',
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(mocks.mockGenerateContent.mock.calls[1]?.[0]).toContain('Listing description must be between 200 and 350 words; current count is');
    expect(data.listing.description).toBe(validDescription);
  });

  it('returns 422 after all 8 generate-etsy attempts fail validation', async () => {
    const invalidListing = buildListingJson(buildStrictDescription(73));
    mocks.mockGenerateContent.mockResolvedValue(invalidListing);

    const response = await generateEtsyPost(
      asNextRequest({
        nicheId: 'adhd',
        productTypeId: 'daily-planner',
        productName: 'ADHD Daily Planner Printable',
      })
    );
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(mocks.mockGenerateContent).toHaveBeenCalledTimes(8);
    expect(data.error).toBe('Generated listing description did not meet Etsy quality requirements.');
    expect(data.details.some((issue: string) => issue.startsWith('Listing description must be between 200 and 350 words; current count is '))).toBe(true);
  });

  it('retries generate-etsy when the AI title drifts away from the product title', async () => {
    const offTargetListing = JSON.stringify({
      title: 'Calm Reset Workbook Printable Digital Download',
      tags: LISTING_TAGS,
      description: buildStrictDescription(230),
    });
    const validListing = JSON.stringify({
      title: 'ADHD Daily Planner Printable Digital Download',
      tags: LISTING_TAGS,
      description: buildStrictDescription(230),
    });
    mocks.mockGenerateContent
      .mockResolvedValueOnce(offTargetListing)
      .mockResolvedValueOnce(validListing);

    const response = await generateEtsyPost(
      asNextRequest({
        nicheId: 'adhd',
        productTypeId: 'daily-planner',
        productName: 'ADHD Daily Planner Printable',
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(mocks.mockGenerateContent.mock.calls[1]?.[0]).toContain('Listing title must stay aligned with the PDF/product title');
    expect(data.listing.title).toBe('ADHD Daily Planner Printable Digital Download');
  });

  it('rejects generate-content requests without a valid selection', async () => {
    const response = await generateContentPost(asNextRequest({ nicheId: 'adhd' }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('nicheId and productTypeId are required.');
    expect(mocks.mockGenerateContent).not.toHaveBeenCalled();
  });

  it('rejects generate-etsy requests with an invalid product selection', async () => {
    const response = await generateEtsyPost(
      asNextRequest({
        nicheId: 'adhd',
        productTypeId: 'not-real',
        productName: 'ADHD Daily Planner Printable',
      })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid nicheId or productTypeId.');
    expect(mocks.mockGenerateContent).not.toHaveBeenCalled();
  });

  it('rejects generate-pdf requests with an invalid product selection', async () => {
    const response = await generatePdfPost(
      asNextRequest({
        nicheId: 'adhd',
        productTypeId: 'not-real',
        title: 'Broken PDF Request',
        content: {
          title: 'Broken PDF Request',
          sections: [{ name: 'One Section', items: ['One useful item'] }],
        },
      })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid nicheId or productTypeId.');
  });

  it('rejects generate-title-ideas requests without both selection fields', async () => {
    const response = await generateTitleIdeasPost(asNextRequest({ nicheId: 'adhd' }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('nicheId and productTypeId are required.');
  });
});