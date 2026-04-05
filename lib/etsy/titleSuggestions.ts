import { getNicheById, getProductById } from '@/lib/niches';

export interface ProductNameIdea {
  title: string;
  score: number;
  reasons: string[];
}

const MAX_TITLE_LENGTH = 140;

const BUYER_INTENT_PHRASES = [
  'Printable',
  'Digital Download',
  'Instant Download',
  'Template',
  'Planner',
  'Workbook',
  'Journal',
  'Tracker',
  'Checklist',
];

const TITLE_SLOP_PHRASES = [
  'for women & men',
  'therapy-inspired',
  'starter pack',
  'toolkit',
  'bundle',
  'high-function',
  'self-help',
  'must-have',
  'best seller',
  'game changer',
];

const TITLE_STOP_WORDS = new Set([
  'the', 'a', 'an', 'for', 'and', 'or', 'to', 'of', 'in', 'on', 'with', 'your',
  'digital', 'download', 'instant', 'printable', 'pdf',
]);

const NICHE_KEYWORDS: Record<string, string[]> = {
  adhd: ['ADHD', 'Focus', 'Executive Function', 'Time Blocking', 'Dopamine Friendly'],
  mdd: ['Self Care', 'Mental Health', 'Mood', 'Wellness', 'Therapy'],
  anxiety: ['Anxiety Relief', 'Calm', 'Grounding', 'Stress Management', 'CBT'],
  social: ['Social Skills', 'Conversation', 'Boundaries', 'Confidence', 'Communication'],
  human: ['Productivity', 'Goal Setting', 'Life Organization', 'Planning', 'Routine'],
  techie: ['Developer', 'Tech', 'Engineering', 'Sprint', 'Productivity'],
};

function titleCaseWords(input: string): string {
  return input
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function normalizeToken(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function extractCoreTerms(input: string): string[] {
  return input
    .split(/\s+/)
    .map(normalizeToken)
    .filter((word) => word.length >= 3 && !TITLE_STOP_WORDS.has(word));
}

function dedupeWords(words: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of words) {
    const word = raw.trim();
    if (!word) continue;
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(word);
  }
  return result;
}

function dedupeWordsInTitle(title: string): string {
  // Split on pipe/colon separators, dedupe words within each segment, then rejoin
  const segments = title.split(/(\s*[|:]\s*)/);
  return segments
    .map((seg, i) => {
      // Keep the separator tokens (odd indices) as-is
      if (i % 2 === 1) return seg;
      const seen = new Set<string>();
      return seg
        .trim()
        .split(/\s+/)
        .filter((word) => {
          const key = word.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .join(' ');
    })
    .join('');
}

function trimToEtsyTitleLimit(title: string): string {
  if (title.length <= MAX_TITLE_LENGTH) return title;
  return `${title.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…`;
}

function hasSlopPhrase(title: string): boolean {
  const lower = title.toLowerCase();
  return TITLE_SLOP_PHRASES.some((phrase) => lower.includes(phrase));
}

function isRepetitiveTitle(title: string): boolean {
  const words = title
    .replace(/[^a-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .map(normalizeToken)
    .filter(Boolean);

  if (words.length < 6) return false;
  const uniqueRatio = new Set(words).size / words.length;
  return uniqueRatio < 0.62;
}

function matchesRootTitle(title: string, rootTitle: string): boolean {
  const titleTerms = new Set(extractCoreTerms(title));
  const rootTerms = extractCoreTerms(rootTitle);
  if (!rootTerms.length) return true;

  const sharedCount = rootTerms.filter((term) => titleTerms.has(term)).length;
  return sharedCount >= Math.max(1, Math.ceil(rootTerms.length / 2));
}

function isHighQualityTitleIdea(title: string, rootTitle: string): boolean {
  if (hasSlopPhrase(title)) return false;
  if (isRepetitiveTitle(title)) return false;
  if (!matchesRootTitle(title, rootTitle)) return false;
  return true;
}

function scoreIdea(title: string, nicheKeyword: string, rootTitle: string): ProductNameIdea {
  const titleLower = title.toLowerCase();
  let score = 58;
  const reasons: string[] = [];

  const keywordHits = BUYER_INTENT_PHRASES.filter((k) => titleLower.includes(k.toLowerCase())).length;
  score += Math.min(20, keywordHits * 5);
  if (keywordHits >= 3) reasons.push('Strong buyer-intent terms improve Etsy search match quality.');

  if (titleLower.includes(nicheKeyword.toLowerCase())) {
    score += 10;
    reasons.push('Niche keyword increases relevance for targeted buyers.');
  }

  if (matchesRootTitle(title, rootTitle)) {
    score += 8;
    reasons.push('Title stays aligned with the underlying PDF/product title.');
  }

  const length = title.length;
  if (length >= 90 && length <= 135) {
    score += 12;
    reasons.push('Title length is in a strong Etsy SEO range (90-135 chars).');
  } else if (length >= 70 && length < 90) {
    score += 6;
    reasons.push('Title length is decent but can include more search intent phrases.');
  } else if (length > 135) {
    score -= 6;
    reasons.push('Title may be too long and harder to scan quickly.');
  }

  const hasSeparator = /[|:\-]/.test(title);
  if (hasSeparator) {
    score += 4;
    reasons.push('Readable separators help scanability on crowded search pages.');
  }

  if (hasSlopPhrase(title)) {
    score -= 25;
    reasons.push('Title includes salesy filler instead of concrete product wording.');
  }

  if (isRepetitiveTitle(title)) {
    score -= 18;
    reasons.push('Title repeats itself instead of adding meaningful search intent.');
  }

  if (reasons.length === 0) {
    reasons.push('Balanced keyword mix with clear buyer intent.');
  }

  return {
    title,
    score: Math.max(0, Math.min(100, score)),
    reasons,
  };
}

export function generateProductNameIdeas(input: {
  nicheId: string;
  productTypeId: string;
  customTitle?: string;
  limit?: number;
}): ProductNameIdea[] {
  const { nicheId, productTypeId, customTitle, limit = 8 } = input;
  const niche = getNicheById(nicheId);
  const product = getProductById(nicheId, productTypeId);

  if (!niche || !product) return [];

  const rootTitle = titleCaseWords(customTitle || product.name);
  const nicheKeywordPool = NICHE_KEYWORDS[nicheId] || [niche.name];

  // Cycle through the FULL keyword pool — not just slots 0 and 1 — so every keyword
  // combination gets represented and results genuinely differ between niches.
  const kw = (i: number) => nicheKeywordPool[i % nicheKeywordPool.length] || niche.name;

  // Generate a larger pool of distinct patterns, then score and trim to limit.
  // Using all 5 keyword positions ensures actual variety across the idea set.
  const rawIdeas = [
    `${rootTitle} Printable | ${kw(0)} Digital Download`,
    `${rootTitle} PDF | ${kw(0)} Printable Template`,
    `${kw(0)} ${rootTitle} | Instant Digital Download`,
    `${rootTitle} Printable PDF | ${kw(1)} Download`,
    `${kw(1)} ${rootTitle} Printable | PDF Download`,
    `${rootTitle} Template | ${kw(2)} Printable PDF`,
    `Printable ${rootTitle} | ${kw(3)} Digital Download`,
    `${kw(2)} ${rootTitle} PDF | Printable Download`,
    `${rootTitle} | ${kw(4)} Printable Template`,
    `${rootTitle} Digital Download | ${kw(0)} Printable`,
    `${kw(3)} ${rootTitle} Printable PDF | Instant Download`,
    `${rootTitle} Printable Template | ${kw(1)} PDF`,
  ];

  const uniqueIdeas = dedupeWords(rawIdeas).filter((idea) => isHighQualityTitleIdea(idea, rootTitle));

  const scored = uniqueIdeas
    .map((idea) => dedupeWordsInTitle(idea))
    .filter((idea) => isHighQualityTitleIdea(idea, rootTitle))
    .map((idea) => trimToEtsyTitleLimit(idea))
    .map((idea) => scoreIdea(idea, kw(0), rootTitle))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  return scored.slice(0, Math.max(1, Math.min(limit, 16)));
}
