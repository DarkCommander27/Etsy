import { describe, expect, it } from 'vitest';
import {
  applyContentQualityRepairs,
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

  it('penalizes generic and repetitive printable content', () => {
    const quality = evaluateProductQuality({
      title: 'Section',
      subtitle: 'Short',
      instructions: 'Write stuff',
      sections: [
        { name: 'Stuff', items: ['Same item', 'Same item', 'Same item'] },
        { name: 'Notes', items: ['Same item', 'Same item', 'Same item'] },
      ],
      affirmation: 'You can do it.',
    });

    expect(quality.score).toBeLessThan(PRODUCT_QUALITY_MIN_SCORE);
    expect(quality.issues.some((issue) => issue.includes('generic'))).toBe(true);
    expect(quality.issues.some((issue) => issue.includes('repetitive'))).toBe(true);
  });

  it('does not flag missing guidance when actionable steps are present', () => {
    const quality = evaluateProductQuality({
      title: 'Morning Focus Routine',
      subtitle: 'A 15-minute system to start work intentionally',
      sections: [
        {
          name: 'Preparation',
          description: 'Set your workspace and intention',
          items: ['Clear desk', 'Open top priority task', 'Silence notifications'],
        },
        {
          name: 'Execution',
          description: 'Move directly into deep work',
          items: ['Set timer for 15 minutes', 'Work only on one task', 'Mark progress at end'],
        },
        {
          name: 'Reflection',
          description: 'Capture what worked',
          items: ['Note distraction triggers', 'Record one win', 'Choose first next action'],
        },
      ],
      steps: [
        { number: 1, sense: 'START', instruction: 'Pick one high-impact task before checking messages.' },
        { number: 2, sense: 'FOCUS', instruction: 'Run one focused sprint with no app switching.' },
        { number: 3, sense: 'RECAP', instruction: 'Write a one-line recap and next action.' },
      ],
      affirmation: 'Small starts build momentum.',
    });

    expect(quality.issues).not.toContain('Missing practical instructions or guided prompts.');
  });

  it('does not flag missing guidance when after_dump_prompt is present', () => {
    const quality = evaluateProductQuality({
      title: 'Brain Dump Reset',
      subtitle: 'Empty your thoughts and pick one next action',
      sections: [
        {
          name: 'Tasks & To-Dos',
          description: 'Write every task currently in your head',
          items: ['Client follow-up', 'Pay utility bill', 'Book dentist appointment'],
        },
        {
          name: 'Worries',
          description: 'List concerns without filtering',
          items: ['Deadline pressure', 'Health admin', 'Family logistics'],
        },
        {
          name: 'Ideas',
          description: 'Capture sparks before they disappear',
          items: ['Weekend project concept', 'Meal prep shortcut', 'Workspace tweak'],
        },
      ],
      after_dump_prompt: 'Circle one item you can complete in 10 minutes and do it now.',
      affirmation: 'Progress starts with one clear next action.',
    });

    expect(quality.issues).not.toContain('Missing practical instructions or guided prompts.');
  });

  it('adds practical guidance for structured planner content when missing', () => {
    const repaired = applyContentQualityRepairs({
      title: 'Weekly Focus Planner',
      subtitle: 'Map your week before it gets busy',
      top_3_priorities: ['Client work', 'Meal prep', 'Workout plan'],
      time_blocks: [
        { time: 'Monday', task: '' },
        { time: 'Tuesday', task: '' },
        { time: 'Wednesday', task: '' },
        { time: 'Thursday', task: '' },
        { time: 'Friday', task: '' },
        { time: 'Saturday', task: '' },
        { time: 'Sunday', task: '' },
      ],
      affirmation: 'Small planning sessions reduce stress later.',
    });

    expect(repaired.after_instruction).toBeTruthy();
    const quality = evaluateProductQuality(repaired);
    expect(quality.issues).not.toContain('Missing practical instructions or guided prompts.');
  });

  it('does not overwrite existing guidance during repair', () => {
    const repaired = applyContentQualityRepairs({
      title: 'Brain Reset Journal',
      subtitle: 'Clear your mind and choose one next step',
      sections: [
        { name: 'Tasks', description: 'Capture open loops', items: ['Email Sam', 'Book appointment', 'Pay invoice'] },
        { name: 'Ideas', description: 'Capture creative sparks', items: ['New offer idea', 'Content angle', 'Workflow tweak'] },
        { name: 'Worries', description: 'Name concerns directly', items: ['Deadline', 'Finances', 'Decision fatigue'] },
      ],
      instructions: 'Write fast, do not self-edit, then choose one item to handle first.',
      affirmation: 'Clarity comes from getting it out of your head.',
    });

    expect(repaired.instructions).toBe('Write fast, do not self-edit, then choose one item to handle first.');
    expect(repaired.after_instruction).toBeUndefined();
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
