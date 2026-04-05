export interface EtsyCategoryInfo {
  label: string;
  path: string;
  taxonomyId: number;
}

const CALENDARS_PLANNERS: EtsyCategoryInfo = {
  label: 'Calendars & Planners',
  path: 'Paper & Party Supplies > Paper > Calendars & Planners',
  taxonomyId: 2078,
};

const JOURNALS_NOTEBOOKS: EtsyCategoryInfo = {
  label: 'Journals & Notebooks',
  path: 'Paper & Party Supplies > Paper > Journals & Notebooks',
  taxonomyId: 2070,
};

const PATTERNS_BLUEPRINTS: EtsyCategoryInfo = {
  label: 'Patterns & Blueprints',
  path: 'Craft Supplies & Tools > Patterns & Blueprints',
  taxonomyId: 6545,
};

const STATIONERY: EtsyCategoryInfo = {
  label: 'Stationery',
  path: 'Paper & Party Supplies > Paper > Stationery',
  taxonomyId: 2076,
};

const JOURNAL_PRODUCT_IDS = new Set([
  'brain-dump',
  'gratitude-journal',
  'worry-dump',
  'reading-tracker',
  'mood-checkin',
  'therapy-prep',
  'progress-tracker',
  'gentle-planner',
]);

const STATIONERY_PRODUCT_IDS = new Set([
  'affirmation-deck',
  'small-win-cards',
  'conversation-starters',
]);

const WORKSHEET_PRODUCT_IDS = new Set([
  'cbt-thought-record',
  'grounding-5-4-3-2-1',
  'box-breathing',
  'therapy-prep',
  'boundary-scripts',
  'small-talk',
  'meeting-prep',
  'code-review',
  'bug-triage',
  'system-design',
  'goal-setting',
  'vision-board',
]);

export function getEtsyCategoryForProduct(
  nicheId: string,
  productTypeId: string,
  productName?: string
): EtsyCategoryInfo {
  const pid = (productTypeId || '').toLowerCase();
  const name = (productName || '').toLowerCase();

  if (JOURNAL_PRODUCT_IDS.has(pid) || name.includes('journal')) {
    return JOURNALS_NOTEBOOKS;
  }

  if (STATIONERY_PRODUCT_IDS.has(pid) || name.includes('stationery')) {
    return STATIONERY;
  }

  if (WORKSHEET_PRODUCT_IDS.has(pid) || name.includes('worksheet')) {
    return PATTERNS_BLUEPRINTS;
  }

  if (nicheId === 'human' && name.includes('notebook')) {
    return JOURNALS_NOTEBOOKS;
  }

  return CALENDARS_PLANNERS;
}