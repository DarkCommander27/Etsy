import { describe, expect, it } from 'vitest';
import { generateProductNameIdeas } from '@/lib/etsy/titleSuggestions';

describe('generateProductNameIdeas', () => {
  it('returns ranked ideas for valid niche/product', () => {
    const ideas = generateProductNameIdeas({
      nicheId: 'adhd',
      productTypeId: 'daily-planner',
      customTitle: 'Focus Planner',
    });

    expect(ideas.length).toBeGreaterThan(0);
    expect(ideas[0]?.score).toBeGreaterThanOrEqual(ideas[ideas.length - 1]?.score || 0);
    expect(ideas.every((idea) => idea.title.length <= 140)).toBe(true);
  });

  it('returns empty list for invalid ids', () => {
    const ideas = generateProductNameIdeas({
      nicheId: 'unknown',
      productTypeId: 'missing',
    });

    expect(ideas).toEqual([]);
  });
});
