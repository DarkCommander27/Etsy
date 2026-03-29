import { z } from 'zod';

const shortText = (max: number) => z.string().trim().min(1).max(max);

const sectionSchema = z.object({
  name: shortText(80),
  description: z.string().trim().max(240).optional(),
  items: z.array(shortText(160)).min(1).max(16),
});

const categorySchema = z.object({
  name: shortText(80),
  icon: z.string().trim().max(8).optional(),
  lines: z.number().int().min(1).max(16).optional(),
});

const timeBlockSchema = z.object({
  time: shortText(40),
  task: z.string().trim().max(160),
});

const stepSchema = z.object({
  number: z.number().int().min(1).max(20),
  sense: shortText(40),
  icon: z.string().trim().max(8).optional(),
  instruction: shortText(240),
});

const columnSchema = z.object({
  name: shortText(40),
  prompt: shortText(200),
});

const productContentSchema = z.object({
  title: shortText(140),
  subtitle: z.string().trim().max(180).optional(),
  instructions: z.string().trim().max(600).optional(),
  date_label: z.string().trim().max(80).optional(),
  top_3_priorities: z.array(shortText(140)).min(1).max(5).optional(),
  time_blocks: z.array(timeBlockSchema).min(1).max(24).optional(),
  sections: z.array(sectionSchema).min(1).max(12).optional(),
  categories: z.array(categorySchema).min(1).max(16).optional(),
  steps: z.array(stepSchema).min(1).max(12).optional(),
  prompts: z.array(shortText(240)).min(1).max(12).optional(),
  columns: z.array(columnSchema).min(1).max(8).optional(),
  affirmation: z.string().trim().max(260).optional(),
  reminder: z.string().trim().max(260).optional(),
  after_instruction: z.string().trim().max(260).optional(),
  after_dump_prompt: z.string().trim().max(260).optional(),
  note: z.string().trim().max(260).optional(),
  win_of_day: z.string().trim().max(160).optional(),
  energy_check: z.string().trim().max(200).optional(),
  water_check: z.string().trim().max(200).optional(),
}).passthrough().superRefine((value, ctx) => {
  const hasRenderableContent = Boolean(
    value.instructions ||
    value.date_label ||
    value.top_3_priorities?.length ||
    value.time_blocks?.length ||
    value.sections?.length ||
    value.categories?.length ||
    value.steps?.length ||
    value.prompts?.length ||
    value.columns?.length
  );

  if (!hasRenderableContent) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['title'],
      message: 'Generated content must include at least one renderable content block.',
    });
  }
});

const etsyListingSchema = z.object({
  title: shortText(140).min(10),
  tags: z.array(shortText(20)).min(1).max(13),
  description: z.string().trim().min(220).max(4000),
});

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/).optional();

const listingImageRequestSchema = z.object({
  nicheId: shortText(40),
  productTypeId: shortText(80),
  title: shortText(140),
  imageCount: z.number().int().min(1).max(5).default(5),
  colorScheme: z.object({
    name: z.string().trim().max(80).optional(),
    primary: hexColorSchema,
    secondary: hexColorSchema,
    accent: hexColorSchema,
    background: hexColorSchema,
  }).optional(),
  settings: z.object({
    openaiApiKey: z.string().trim().min(1).optional(),
  }).optional(),
});

const listingImageMetaSchema = z.object({
  id: shortText(120),
  rank: z.number().int().min(1).max(5),
  filename: shortText(180),
  url: shortText(320),
  width: z.number().int().min(1),
  height: z.number().int().min(1),
  prompt: shortText(2000),
  createdAt: shortText(80),
});

export type ProductContent = z.infer<typeof productContentSchema>;
export type EtsyListingDraft = z.infer<typeof etsyListingSchema>;
export type ListingImageRequest = z.infer<typeof listingImageRequestSchema>;
export type ListingImageMeta = z.infer<typeof listingImageMetaSchema>;

export const PRODUCT_QUALITY_MIN_SCORE = 90;

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  warnings: string[];
  issues: string[];
  error?: string;
}

function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length ? `${issue.path.join('.')}: ` : '';
    return `${path}${issue.message}`;
  });
}

function looksLikeRefusal(raw: string): boolean {
  return /(i can'?t|i cannot|unable to|won'?t be able to|sorry)/i.test(raw);
}

export function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < raw.length; index += 1) {
    const char = raw[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return raw.slice(start, index + 1);
      }
    }
  }

  return null;
}

function collectProductWarnings(content: ProductContent): string[] {
  const warnings: string[] = [];

  if (content.title.length > 80) {
    warnings.push('Product title is long and may wrap awkwardly in the PDF header.');
  }

  if (content.sections?.some((section) => section.items.length < 2)) {
    warnings.push('At least one section has fewer than 2 items, which may make the product feel thin.');
  }

  if (content.categories?.some((category) => (category.lines || 0) < 2)) {
    warnings.push('At least one category has fewer than 2 writing lines.');
  }

  if (!content.affirmation && !content.reminder && !content.note && !content.after_instruction) {
    warnings.push('No closing note or affirmation was generated.');
  }

  return warnings;
}

function normalizeQualityText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function getProductUsabilityIssues(content: ProductContent): string[] {
  const issues: string[] = [];
  const title = normalizeQualityText(content.title || '');
  const subtitle = normalizeQualityText(content.subtitle || '');
  const instructions = normalizeQualityText(content.instructions || '');

  const genericNames = new Set(['section', 'section 1', 'section 2', 'stuff', 'notes', 'misc', 'other']);
  const badPhrases = [
    'high quality product',
    'perfect for everyone',
    'must have',
    'best seller',
    'lorem ipsum',
    'blah blah',
  ];

  if (genericNames.has(title)) {
    issues.push('Title is too generic to feel like a real product.');
  }

  if (subtitle && subtitle.length < 12) {
    issues.push('Subtitle is too short to add meaningful context.');
  }

  if (instructions && instructions.length < 24) {
    issues.push('Instructions are too short to guide a real buyer.');
  }

  const sectionNames = (content.sections || []).map((section) => normalizeQualityText(section.name));
  if (sectionNames.some((name) => genericNames.has(name))) {
    issues.push('One or more section names are too generic.');
  }

  const sectionDescriptions = (content.sections || []).map((section) => normalizeQualityText(section.description || ''));
  if (content.sections?.length && sectionDescriptions.filter(Boolean).length === 0) {
    issues.push('Structured sections need brief descriptions for clarity.');
  }

  const textUnits = [
    ...(content.sections || []).flatMap((section) => section.items || []),
    ...(content.prompts || []),
    ...((content.steps || []).map((step) => step.instruction)),
    ...((content.columns || []).map((column) => `${column.name} ${column.prompt}`)),
  ].map((value) => normalizeQualityText(String(value || ''))).filter(Boolean);

  const uniqueUnits = new Set(textUnits);
  if (textUnits.length >= 6 && uniqueUnits.size / textUnits.length < 0.7) {
    issues.push('Content is too repetitive and will feel low value to buyers.');
  }

  const actionableCount =
    (content.sections || []).reduce((sum, section) => sum + section.items.length, 0) +
    (content.prompts?.length || 0) +
    (content.steps?.length || 0) +
    (content.columns?.length || 0) +
    (content.categories?.length || 0) +
    (content.time_blocks?.length || 0);
  if (actionableCount < 6) {
    issues.push('Content does not include enough usable elements for a premium printable.');
  }

  const combinedText = [title, subtitle, instructions, ...textUnits].join(' ');
  for (const phrase of badPhrases) {
    if (combinedText.includes(phrase)) {
      issues.push(`Content uses generic filler phrase: "${phrase}".`);
    }
  }

  return [...new Set(issues)];
}

export function evaluateProductQuality(content: ProductContent): { score: number; issues: string[] } {
  let score = 100;
  const issues: string[] = [];

  if (content.title.length < 8) {
    score -= 12;
    issues.push('Title is too short and likely low-conversion.');
  }

  if (!content.subtitle) {
    score -= 10;
    issues.push('Missing subtitle/context line.');
  }

  const hasPrimaryBlocks = Boolean(
    content.sections?.length ||
    content.categories?.length ||
    content.time_blocks?.length ||
    content.steps?.length ||
    content.columns?.length
  );
  if (!hasPrimaryBlocks) {
    score -= 30;
    issues.push('No substantial content blocks for a useful printable.');
  }

  if (content.sections?.length) {
    const shallow = content.sections.filter((s) => s.items.length < 3).length;
    if (shallow > 0) {
      score -= Math.min(22, shallow * 6);
      issues.push('One or more sections are too shallow (fewer than 3 items).');
    }
  }

  if (content.sections?.length && content.sections.length < 3) {
    score -= 8;
    issues.push('Generated worksheet has too few sections for a premium-quality printable.');
  }

  if (content.time_blocks?.length && content.time_blocks.length < 6) {
    score -= 12;
    issues.push('Schedule block is too short to be practically useful.');
  }

  const hasGuidance = Boolean(
    content.instructions ||
    content.prompts?.length ||
    content.steps?.length ||
    content.columns?.length ||
    content.after_instruction ||
    content.after_dump_prompt
  );
  if (!hasGuidance) {
    score -= 14;
    issues.push('Missing practical instructions or guided prompts.');
  }

  if (!content.affirmation && !content.reminder && !content.note && !content.after_instruction) {
    score -= 6;
    issues.push('Missing closing note/affirmation.');
  }

  const usabilityIssues = getProductUsabilityIssues(content);
  if (usabilityIssues.length > 0) {
    score -= Math.min(24, usabilityIssues.length * 6);
    issues.push(...usabilityIssues);
  }

  return { score: Math.max(0, Math.min(100, score)), issues };
}

function normalizeTags(tags: string[]): { tags: string[]; deduped: boolean; trimmed: boolean } {
  const seen = new Set<string>();
  const normalized: string[] = [];
  let deduped = false;
  let trimmed = false;

  for (const rawTag of tags) {
    const tag = rawTag.replace(/\s+/g, ' ').trim();
    if (!tag) continue;

    const key = tag.toLowerCase();
    if (seen.has(key)) {
      deduped = true;
      continue;
    }

    seen.add(key);

    if (tag.length > 20) {
      trimmed = true;
    }

    normalized.push(tag.slice(0, 20));
  }

  return { tags: normalized.slice(0, 13), deduped, trimmed };
}

function collectListingWarnings(listing: EtsyListingDraft): string[] {
  const warnings: string[] = [];
  const title = listing.title.toLowerCase();
  const description = listing.description.toLowerCase();

  if (!title.includes('printable')) {
    warnings.push('Listing title does not include "printable".');
  }

  if (!title.includes('digital')) {
    warnings.push('Listing title does not include "digital" or "digital download".');
  }

  if (listing.tags.length < 13) {
    warnings.push('Listing has fewer than 13 tags, which reduces Etsy search coverage.');
  }

  if (listing.description.length < 200 || listing.description.length > 350) {
    warnings.push('Listing description is outside the target 200-350 word-quality range.');
  }

  if (!description.includes('instant digital download')) {
    warnings.push('Listing description does not mention instant digital download.');
  }

  if (!description.includes('pdf')) {
    warnings.push('Listing description does not mention PDF format.');
  }

  return warnings;
}

function getAntiGenericListingIssues(listing: EtsyListingDraft): string[] {
  const issues: string[] = [];
  const title = listing.title.toLowerCase();
  const description = listing.description.toLowerCase();

  const bannedPhrases = [
    'best seller',
    'must have',
    'perfect for everyone',
    'high quality product',
    'premium quality',
    'lorem ipsum',
    'blah blah',
  ];

  for (const phrase of bannedPhrases) {
    if (title.includes(phrase) || description.includes(phrase)) {
      issues.push(`Listing uses generic marketing phrase: "${phrase}".`);
    }
  }

  const titleWords = title.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const titleUniqueRatio = titleWords.length
    ? new Set(titleWords).size / titleWords.length
    : 1;
  if (titleWords.length >= 6 && titleUniqueRatio < 0.55) {
    issues.push('Listing title is overly repetitive and reads as generic copy.');
  }

  const descriptionWords = description.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const descriptionUniqueRatio = descriptionWords.length
    ? new Set(descriptionWords).size / descriptionWords.length
    : 1;
  if (descriptionWords.length >= 80 && descriptionUniqueRatio < 0.35) {
    issues.push('Listing description is too repetitive and not specific enough.');
  }

  if (!/(adhd|anxiety|mood|planner|tracker|worksheet|printable|template|checklist|journal)/i.test(description)) {
    issues.push('Listing description lacks specific product/use-case language.');
  }

  return issues;
}

export function evaluateNichePublishChecklist(
  nicheId: string,
  productTypeId: string,
  content: ProductContent
): string[] {
  const key = `${nicheId}:${productTypeId}`.toLowerCase();
  const issues: string[] = [];

  const sectionCount = content.sections?.length || 0;
  const categoryCount = content.categories?.length || 0;
  const timeBlockCount = content.time_blocks?.length || 0;
  const promptCount = content.prompts?.length || 0;
  const totalSectionItems = (content.sections || []).reduce((sum, section) => sum + section.items.length, 0);
  const hasGuidance = Boolean(content.instructions || promptCount > 0 || content.after_instruction);

  if (/(planner|schedule|tracker|log|reset|sprint|standup|roadmap)/.test(key)) {
    if (!sectionCount && !categoryCount && !timeBlockCount) {
      issues.push('Planner/tracker products must include structured sections, categories, or time blocks.');
    }
    if (!hasGuidance) {
      issues.push('Planner/tracker products should include usage instructions or prompts.');
    }
    if (totalSectionItems < 6 && timeBlockCount < 6) {
      issues.push('Planner/tracker products need more actionable entries to be practically useful.');
    }
  }

  if (/(journal|dump|thought|record|prep|reflection)/.test(key)) {
    if (!promptCount && !sectionCount) {
      issues.push('Journal/reflection products should include prompts or guided sections.');
    }
    if (!hasGuidance) {
      issues.push('Journal/reflection products should include a clear usage instruction.');
    }
  }

  if (/(cards|deck|affirmation)/.test(key) && totalSectionItems < 8) {
    issues.push('Card/deck products should include at least 8 printable statements/items.');
  }

  if (/(menu|kit|list)/.test(key) && sectionCount + categoryCount < 2) {
    issues.push('Menu/kit/list products should include at least 2 grouped sections/categories.');
  }

  if (/(budget|goal|fitness|habit)/.test(key) && !hasGuidance) {
    issues.push('Goal and tracking products should include guidance for daily/weekly use.');
  }

  return [...new Set(issues)];
}

export function parseGeneratedProductContent(raw: string): ValidationResult<ProductContent> {
  const warnings: string[] = [];

  if (!raw.trim()) {
    return {
      success: false,
      warnings,
      issues: ['AI returned an empty response.'],
      error: 'The AI provider returned empty product content.',
    };
  }

  if (looksLikeRefusal(raw) && !raw.includes('{')) {
    return {
      success: false,
      warnings,
      issues: ['AI returned refusal text instead of structured product content.'],
      error: 'The AI provider did not return printable content.',
    };
  }

  const jsonText = extractJsonObject(raw);
  if (!jsonText) {
    return {
      success: false,
      warnings,
      issues: ['No JSON object could be extracted from the AI response.'],
      error: 'The AI provider did not return valid JSON.',
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return {
      success: false,
      warnings,
      issues: ['The extracted JSON object could not be parsed.'],
      error: 'The AI provider returned malformed JSON.',
    };
  }

  const result = productContentSchema.safeParse(parsed);
  if (!result.success) {
    return {
      success: false,
      warnings,
      issues: formatIssues(result.error),
      error: 'Generated product content is incomplete or malformed.',
    };
  }

  return {
    success: true,
    data: result.data,
    warnings: collectProductWarnings(result.data),
    issues: [],
  };
}

export function validateProductContent(content: unknown): ValidationResult<ProductContent> {
  const result = productContentSchema.safeParse(content);
  if (!result.success) {
    return {
      success: false,
      warnings: [],
      issues: formatIssues(result.error),
      error: 'Product content is incomplete or invalid.',
    };
  }

  return {
    success: true,
    data: result.data,
    warnings: collectProductWarnings(result.data),
    issues: [],
  };
}

export function parseGeneratedEtsyListing(raw: string): ValidationResult<EtsyListingDraft> {
  const warnings: string[] = [];

  if (!raw.trim()) {
    return {
      success: false,
      warnings,
      issues: ['AI returned an empty response.'],
      error: 'The AI provider returned empty Etsy listing content.',
    };
  }

  if (looksLikeRefusal(raw) && !raw.includes('{')) {
    return {
      success: false,
      warnings,
      issues: ['AI returned refusal text instead of listing JSON.'],
      error: 'The AI provider did not return an Etsy listing.',
    };
  }

  const jsonText = extractJsonObject(raw);
  if (!jsonText) {
    return {
      success: false,
      warnings,
      issues: ['No JSON object could be extracted from the AI response.'],
      error: 'The AI provider did not return valid listing JSON.',
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return {
      success: false,
      warnings,
      issues: ['The extracted listing JSON could not be parsed.'],
      error: 'The AI provider returned malformed listing JSON.',
    };
  }

  return validateEtsyListing(parsed, { requireAllTags: true });
}

export function validateEtsyListing(
  listing: unknown,
  options?: { requireAllTags?: boolean }
): ValidationResult<EtsyListingDraft> {
  if (!listing || typeof listing !== 'object') {
    return {
      success: false,
      warnings: [],
      issues: ['Listing payload must be an object.'],
      error: 'Listing payload is invalid.',
    };
  }

  const candidate = listing as { title?: unknown; description?: unknown; tags?: unknown };
  const normalized = normalizeTags(Array.isArray(candidate.tags) ? candidate.tags.filter((tag): tag is string => typeof tag === 'string') : []);
  const parsedCandidate = {
    title: typeof candidate.title === 'string' ? candidate.title.trim() : '',
    description: typeof candidate.description === 'string' ? candidate.description.trim() : '',
    tags: normalized.tags,
  };

  const result = etsyListingSchema.safeParse(parsedCandidate);
  if (!result.success) {
    return {
      success: false,
      warnings: [],
      issues: formatIssues(result.error),
      error: 'Listing content is incomplete or invalid.',
    };
  }

  const warnings = collectListingWarnings(result.data);
  const antiGenericIssues = getAntiGenericListingIssues(result.data);
  if (antiGenericIssues.length > 0) {
    return {
      success: false,
      warnings,
      issues: antiGenericIssues,
      error: 'Generated listing copy is too generic. Regenerate for a more specific listing.',
    };
  }
  if (normalized.deduped) {
    warnings.push('Duplicate tags were removed automatically.');
  }
  if (normalized.trimmed) {
    warnings.push('One or more tags were trimmed to Etsy\'s 20 character limit.');
  }
  if (options?.requireAllTags && result.data.tags.length !== 13) {
    return {
      success: false,
      warnings,
      issues: ['Listing must include exactly 13 unique tags for the high-quality publish flow.'],
      error: 'Generated listing did not include 13 valid tags.',
    };
  }

  return {
    success: true,
    data: result.data,
    warnings,
    issues: [],
  };
}

export function validateListingImageRequest(payload: unknown): ValidationResult<ListingImageRequest> {
  const result = listingImageRequestSchema.safeParse(payload);
  if (!result.success) {
    return {
      success: false,
      warnings: [],
      issues: formatIssues(result.error),
      error: 'Listing image request is incomplete or invalid.',
    };
  }

  return {
    success: true,
    data: result.data,
    warnings: [],
    issues: [],
  };
}

export function validateListingImageMeta(payload: unknown): ValidationResult<ListingImageMeta> {
  const result = listingImageMetaSchema.safeParse(payload);
  if (!result.success) {
    return {
      success: false,
      warnings: [],
      issues: formatIssues(result.error),
      error: 'Generated image metadata is invalid.',
    };
  }

  return {
    success: true,
    data: result.data,
    warnings: [],
    issues: [],
  };
}