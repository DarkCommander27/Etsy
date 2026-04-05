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

function scoreIdea(title: string, nicheKeyword: string): ProductNameIdea {
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
    `${rootTitle} Printable ${kw(0)} Planner | Instant Digital Download`,
    `${kw(0)} ${rootTitle} Template for Adults | Editable ${product.name} PDF`,
    `${rootTitle} ${kw(1)} Workbook | Printable Therapy-Inspired Digital Download`,
    `${rootTitle} Toolkit | ${kw(0)} Checklist + Tracker Printable`,
    `${kw(0)} ${product.name} Bundle | Printable ${kw(1)} Planner Pages`,
    `${rootTitle} Daily Sheet | High-Function ${kw(0)} Template`,
    `${kw(1)} ${rootTitle} Journal | Instant Download Printable`,
    `${rootTitle} for Women & Men | ${kw(0)} Self-Help Printable PDF`,
    `${kw(0)} ${rootTitle} Planner | Simple Printable ${product.name} System`,
    `${rootTitle} Starter Pack | ${kw(1)} Digital Download Toolkit`,
    `${kw(2)} ${rootTitle} Printable | ${kw(0)} Planner Digital Download`,
    `${rootTitle} | ${kw(2)} Worksheet + ${kw(1)} Tracker | Instant PDF`,
    `${kw(3)} ${rootTitle} Template | ${kw(0)} Printable for Adults`,
    `Printable ${rootTitle} ${kw(3)} Kit | Instant Digital Download`,
    `${kw(4)} ${rootTitle} Workbook | ${kw(0)} Digital Planner Pages`,
    `${rootTitle} ${kw(4)} Bundle | Printable ${kw(2)} System PDF`,
    `${kw(2)} ${product.name} Printable | ${kw(3)} Template Instant Download`,
    `${rootTitle} Printable | ${kw(4)} + ${kw(1)} Tracker | Digital PDF`,
    `${kw(3)} ${kw(0)} ${rootTitle} | Printable Instant Download Worksheet`,
    `${rootTitle} Digital Download | ${kw(1)} + ${kw(3)} Planner Template`,
  ];

  const uniqueIdeas = dedupeWords(rawIdeas);

  const scored = uniqueIdeas
    .map((idea) => dedupeWordsInTitle(idea))
    .map((idea) => trimToEtsyTitleLimit(idea))
    .map((idea) => scoreIdea(idea, kw(0)))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  return scored.slice(0, Math.max(1, Math.min(limit, 16)));
}
