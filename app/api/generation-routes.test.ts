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