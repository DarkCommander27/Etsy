import { describe, expect, it } from 'vitest';
import {
  PRODUCT_QUALITY_MIN_SCORE,
  evaluateNichePublishChecklist,
  evaluateProductQuality,
  validateEtsyListing,
  validateListingImageRequest,
} from './generated';

describe('evaluateProductQuality', () => {
  it('scores high-quality printable content above publish threshold', () => {
    const quality = evaluateProductQuality({
      title: 'Weekly Meal Planner',
      subtitle: 'Plan a week of simple meals',
      instructions: 'Pick meals, fill list, prep once.',
      sections: [
        { name: 'Breakfast', description: 'Start strong', items: ['Egg bites', 'Oatmeal', 'Greek yogurt'] },
        { name: 'Lunch', description: 'Easy options', items: ['Chicken salad', 'Wraps', 'Rice bowls'] },
      ],
      affirmation: 'Consistency beats perfection.',
    });

    expect(quality.score).toBeGreaterThanOrEqual(PRODUCT_QUALITY_MIN_SCORE);
    expect(quality.issues.length).toBeLessThanOrEqual(2);
  });

  it('flags low-effort content below publish threshold', () => {
    const quality = evaluateProductQuality({
      title: 'Plan',
      sections: [{ name: 'Stuff', items: ['One'] }],
      time_blocks: [{ time: '9:00', task: 'Thing' }],
    });

    expect(quality.score).toBeLessThan(PRODUCT_QUALITY_MIN_SCORE);
    expect(quality.issues.length).toBeGreaterThan(0);
  });
});

describe('validateEtsyListing', () => {
  it('deduplicates and trims tags while remaining valid', () => {
    const result = validateEtsyListing(
      {
        title: 'ADHD Daily Planner Printable Digital Download',
        description: 'Instant digital download in PDF format. This printable planner helps users prioritize tasks and structure their day with practical prompts and clear sections. Includes printable worksheet pages for daily focus, routines, and reflection. Use at home or print shop. Designed for practical daily use and simple planning routines with a compassionate tone and clear layout for readability.',
        tags: [
          'adhd planner',
          'ADHD Planner',
          'printable planner for adhd and focus',
        ],
      },
      { requireAllTags: false }
    );

    expect(result.success).toBe(true);
    expect(result.data?.tags.length).toBe(2);
    expect(result.warnings.some((w) => w.includes('Duplicate tags'))).toBe(true);
    expect(result.warnings.some((w) => w.includes('trimmed'))).toBe(true);
  });

  it('rejects generic listing copy', () => {
    const result = validateEtsyListing(
      {
        title: 'Best Seller Must Have Printable Digital Download',
        description: 'This is a high quality product and a must have for everyone. Instant digital download in PDF format. This is the best seller and premium quality product with great value for everyone and perfect for everyone. This is a high quality product and a must have for everyone. This is a high quality product and a must have for everyone.',
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
      },
      { requireAllTags: true }
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('too generic');
  });
});

describe('evaluateNichePublishChecklist', () => {
  it('flags planner content that lacks enough actionable structure', () => {
    const issues = evaluateNichePublishChecklist('adhd', 'daily-planner', {
      title: 'ADHD Daily Planner',
      subtitle: 'Simple planner',
      sections: [{ name: 'Only one', items: ['Task'] }],
      time_blocks: [{ time: '9:00', task: 'Work' }],
    });

    expect(issues.length).toBeGreaterThan(0);
  });
});

describe('validateListingImageRequest', () => {
  it('accepts a valid request payload', () => {
    const result = validateListingImageRequest({
      nicheId: 'adhd',
      productTypeId: 'daily-planner',
      title: 'ADHD Daily Planner',
      imageCount: 5,
      colorScheme: {
        name: 'Calm Blue',
        primary: '#2563EB',
        secondary: '#DBEAFE',
        accent: '#60A5FA',
        background: '#F0F7FF',
      },
    });

    expect(result.success).toBe(true);
    expect(result.data?.imageCount).toBe(5);
  });

  it('rejects invalid color values', () => {
    const result = validateListingImageRequest({
      nicheId: 'adhd',
      productTypeId: 'daily-planner',
      title: 'ADHD Daily Planner',
      colorScheme: {
        primary: 'blue',
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Listing image request is incomplete or invalid.');
  });
});
