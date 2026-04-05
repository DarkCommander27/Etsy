import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
  mockGetContentPrompt: vi.fn(),
  mockGeneratePdf: vi.fn(),
  mockAddHistoryEntry: vi.fn(),
  mockGenerateAndStoreListingImages: vi.fn(),
  mockCreateListing: vi.fn(),
  mockGetConfiguredEtsyApiKey: vi.fn(),
  mockUploadListingFile: vi.fn(),
  mockUploadListingImage: vi.fn(),
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
  mockMkdirSync: vi.fn(),
  mockGetPublishIdempotency: vi.fn(),
  mockSetPublishIdempotency: vi.fn(),
}));

let idempotencyCache: Record<string, { listing_id: number; createdAt: string }> = {};

vi.mock('@/lib/ai/client', () => ({
  generateContent: mocks.mockGenerateContent,
}));

vi.mock('@/lib/ai/prompts', () => ({
  getContentPrompt: mocks.mockGetContentPrompt,
}));

vi.mock('@/lib/pdf/generator', () => ({
  generatePDF: mocks.mockGeneratePdf,
}));

vi.mock('@/lib/db', () => ({
  addHistoryEntry: mocks.mockAddHistoryEntry,
}));

vi.mock('@/lib/images/mockup', () => ({
  generateAndStoreListingImages: mocks.mockGenerateAndStoreListingImages,
}));

vi.mock('@/lib/etsy/client', () => ({
  createListing: mocks.mockCreateListing,
  getConfiguredEtsyApiKey: mocks.mockGetConfiguredEtsyApiKey,
  uploadListingFile: mocks.mockUploadListingFile,
  uploadListingImage: mocks.mockUploadListingImage,
}));

vi.mock('@/lib/storage', () => ({
  getPublishIdempotency: mocks.mockGetPublishIdempotency,
  setPublishIdempotency: mocks.mockSetPublishIdempotency,
}));

vi.mock('fs', () => ({
  default: {
    existsSync: mocks.mockExistsSync,
    readFileSync: mocks.mockReadFileSync,
    writeFileSync: mocks.mockWriteFileSync,
    mkdirSync: mocks.mockMkdirSync,
  },
  existsSync: mocks.mockExistsSync,
  readFileSync: mocks.mockReadFileSync,
  writeFileSync: mocks.mockWriteFileSync,
  mkdirSync: mocks.mockMkdirSync,
}));

import { POST as generateContentPost } from './generate-content/route';
import { POST as generatePdfPost } from './generate-pdf/route';
import { POST as generateImagesPost } from './generate-images/route';
import { POST as publishPost } from './etsy/publish/route';

function asNextRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

const highQualityContent = {
  title: 'ADHD Daily Planner Printable',
  subtitle: 'Structure your day with focus and calm',
  instructions: 'Fill this each morning before opening any apps, then revisit at the end of the day.',
  sections: [
    {
      name: 'Top Priorities',
      description: 'Name the three tasks that matter most today before anything else',
      items: [
        'Write down the single most important task to finish this morning',
        'Name a quick win you can complete in under 10 minutes right now',
        'Identify which task can safely wait until tomorrow without consequence',
      ],
    },
    {
      name: 'Focus Blocks',
      description: 'Match your peak energy windows to your hardest work',
      items: [
        'Block 90 minutes for your hardest task while your energy is still fresh',
        'Set a 5-minute alarm before each block so you can settle in without rushing',
        'Choose one specific distraction to deliberately remove during this block',
      ],
    },
    {
      name: 'End-of-Day Check-In',
      description: 'Acknowledge what moved forward and reset your slate for tomorrow',
      items: [
        'Write one thing you completed today that was on your list',
        'Name the single interruption that cost you the most focused time today',
        'Choose the one task you will start with first thing tomorrow morning',
      ],
    },
  ],
  prompts: ['What one extra action today would make tomorrow noticeably easier?'],
  affirmation: 'Every time you show up and try, you are building a habit that compounds over time.',
};

const lowQualityContent = {
  title: 'Plan',
  sections: [{ name: 'Stuff', items: ['One'] }],
  time_blocks: [{ time: '9:00', task: 'Do thing' }],
};

const listingImages = [1, 2, 3].map((rank) => ({
  id: `img-${rank}`,
  rank,
  filename: `img-${rank}.png`,
  url: `/generated/listing-images/img-${rank}.png`,
  width: 1536,
  height: 1024,
  prompt: `Prompt ${rank}`,
  createdAt: '2026-03-29T00:00:00.000Z',
}));

const validListing = {
  title: 'ADHD Daily Planner Printable Digital Download',
  description:
    'Instant digital download in PDF format. This printable planner helps users prioritize tasks and structure their day with practical prompts and clear sections. Includes printable worksheet pages for daily focus, routines, and reflection. Use at home or print shop. Designed for practical daily use and simple planning routines with a compassionate tone and clear layout for readability.',
  tags: [
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
  ],
};

describe('API automation integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    idempotencyCache = {};
    mocks.mockGetContentPrompt.mockReturnValue('PROMPT');
    mocks.mockGeneratePdf.mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
    mocks.mockAddHistoryEntry.mockImplementation(() => undefined);
    mocks.mockGetPublishIdempotency.mockImplementation((key: string) => idempotencyCache[key] || null);
    mocks.mockSetPublishIdempotency.mockImplementation((key: string, listingId: number) => {
      idempotencyCache[key] = {
        listing_id: listingId,
        createdAt: new Date().toISOString(),
      };
    });
    mocks.mockExistsSync.mockImplementation(() => {
      return true;
    });
    mocks.mockReadFileSync.mockImplementation(() => {
      return Buffer.from([137, 80, 78, 71]);
    });
    mocks.mockWriteFileSync.mockImplementation(() => undefined);
    mocks.mockMkdirSync.mockImplementation(() => undefined);
    mocks.mockCreateListing.mockResolvedValue({ listing_id: 123456 });
    mocks.mockGetConfiguredEtsyApiKey.mockReturnValue('test-key');
    mocks.mockUploadListingFile.mockResolvedValue({ ok: true });
    mocks.mockUploadListingImage.mockResolvedValue({ ok: true });
  });

  it('runs generate content -> PDF -> images -> publish draft successfully', async () => {
    mocks.mockGenerateContent.mockResolvedValueOnce(JSON.stringify(highQualityContent));
    mocks.mockGenerateAndStoreListingImages.mockResolvedValueOnce({
      images: listingImages,
      warnings: [],
    });

    const contentRes = await generateContentPost(
      asNextRequest({ nicheId: 'adhd', productTypeId: 'daily-planner', customTitle: 'ADHD Daily Planner' })
    );
    expect(contentRes.status).toBe(200);
    const contentData = await contentRes.json();
    expect(contentData.content.title).toBe(highQualityContent.title);
    expect(contentData.qualityScore).toBeGreaterThanOrEqual(82);

    const pdfRes = await generatePdfPost(
      asNextRequest({
        nicheId: 'adhd',
        productTypeId: 'daily-planner',
        title: highQualityContent.title,
        pageSize: 'letter',
        colorScheme: { id: 'calm-blue' },
        content: contentData.content,
      })
    );
    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers.get('content-type')).toBe('application/pdf');
    expect(mocks.mockGeneratePdf).toHaveBeenCalledTimes(1);
    expect(mocks.mockAddHistoryEntry).toHaveBeenCalledTimes(1);

    const imagesRes = await generateImagesPost(
      asNextRequest({
        nicheId: 'adhd',
        productTypeId: 'daily-planner',
        title: highQualityContent.title,
        imageCount: 3,
        colorScheme: {
          name: 'Calm Blue',
          primary: '#2563EB',
          secondary: '#DBEAFE',
          accent: '#60A5FA',
          background: '#F0F7FF',
        },
        settings: { openaiApiKey: 'test-openai-key' },
      })
    );
    expect(imagesRes.status).toBe(200);
    const imagesData = await imagesRes.json();
    expect(imagesData.images).toHaveLength(3);

    const shuffledImages = [imagesData.images[2], imagesData.images[0], imagesData.images[1]];
    const publishRes = await publishPost(
      asNextRequest({
        ...validListing,
        price: 5,
        shopId: '12345',
        apiKey: 'test-key',
        pdfOptions: {
          pageSize: 'letter',
          title: highQualityContent.title,
          nicheId: 'adhd',
          productTypeId: 'daily-planner',
          content: contentData.content,
        },
        listingImages: shuffledImages,
      })
    );

    expect(publishRes.status).toBe(200);
    const publishData = await publishRes.json();
    expect(publishData.listing.listing_id).toBe(123456);
    expect(mocks.mockCreateListing).toHaveBeenCalledTimes(1);
    expect(mocks.mockUploadListingFile).toHaveBeenCalledTimes(1);
    expect(mocks.mockUploadListingImage).toHaveBeenCalledTimes(3);

    const uploadedRanks = mocks.mockUploadListingImage.mock.calls.map((call) => call[5]);
    expect(uploadedRanks).toEqual([1, 2, 3]);
  });

  it('blocks publish when product quality is below threshold', async () => {
    const publishRes = await publishPost(
      asNextRequest({
        ...validListing,
        price: 5,
        shopId: '12345',
        apiKey: 'test-key',
        pdfOptions: {
          pageSize: 'letter',
          title: lowQualityContent.title,
          nicheId: 'adhd',
          productTypeId: 'daily-planner',
          content: lowQualityContent,
        },
        listingImages,
      })
    );

    expect(publishRes.status).toBe(422);
    const publishData = await publishRes.json();
    expect(String(publishData.error)).toContain('below publish threshold');
    expect(mocks.mockCreateListing).not.toHaveBeenCalled();
  });

  it('returns cached publish result for the same idempotency key', async () => {
    const idempotencyKey = 'shop::adhd::daily-planner::cached-test';
    const publishPayload = {
      ...validListing,
      price: 5,
      shopId: '12345',
      apiKey: 'test-key',
      idempotencyKey,
      pdfOptions: {
        pageSize: 'letter',
        title: highQualityContent.title,
        nicheId: 'adhd',
        productTypeId: 'daily-planner',
        content: highQualityContent,
      },
      listingImages,
    };

    const firstRes = await publishPost(asNextRequest(publishPayload));
    expect(firstRes.status).toBe(200);
    const firstData = await firstRes.json();
    expect(firstData.listing.listing_id).toBe(123456);
    expect(mocks.mockCreateListing).toHaveBeenCalledTimes(1);

    const secondRes = await publishPost(asNextRequest(publishPayload));
    expect(secondRes.status).toBe(200);
    const secondData = await secondRes.json();
    expect(secondData.idempotent).toBe(true);
    expect(secondData.listing.listing_id).toBe(123456);

    // No second create/upload should occur because response was served from cache.
    expect(mocks.mockCreateListing).toHaveBeenCalledTimes(1);
    expect(mocks.mockUploadListingFile).toHaveBeenCalledTimes(1);
    expect(mocks.mockUploadListingImage).toHaveBeenCalledTimes(3);
  });
});