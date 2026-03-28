// Content quality validation and scoring system

export interface QualityCheck {
  passed: boolean;
  score: number; // 0-100
  issues: string[];
  warnings: string[];
}

export interface ContentSchema {
  title: string;
  subtitle?: string;
  sections?: Array<{
    name: string;
    description?: string;
    items: string[];
  }>;
  categories?: Array<{
    name: string;
    icon?: string;
    lines: number;
  }>;
  steps?: Array<{
    number: number;
    sense?: string;
    icon?: string;
    instruction: string;
  }>;
  affirmation?: string;
  [key: string]: unknown;
}

/**
 * Validates that AI-generated content matches expected JSON schema
 */
export function validateContentSchema(content: unknown): QualityCheck {
  const issues: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  // Check if content is an object
  if (!content || typeof content !== 'object') {
    return {
      passed: false,
      score: 0,
      issues: ['Content is not a valid object'],
      warnings: [],
    };
  }

  const obj = content as Record<string, unknown>;

  // Required: title
  if (!obj.title || typeof obj.title !== 'string' || obj.title.trim().length === 0) {
    issues.push('Missing or empty title field');
    score -= 30;
  } else if (obj.title.length < 3) {
    warnings.push('Title is very short (less than 3 characters)');
    score -= 5;
  }

  // Check for main content structures
  const hasSections = Array.isArray(obj.sections) && obj.sections.length > 0;
  const hasCategories = Array.isArray(obj.categories) && obj.categories.length > 0;
  const hasSteps = Array.isArray(obj.steps) && obj.steps.length > 0;
  const hasTimeBlocks = Array.isArray(obj.time_blocks) && obj.time_blocks.length > 0;

  if (!hasSections && !hasCategories && !hasSteps && !hasTimeBlocks) {
    issues.push('Content is missing main structure (sections, categories, steps, or time_blocks)');
    score -= 40;
  }

  // Validate sections if present
  if (hasSections) {
    const sections = obj.sections as Array<unknown>;
    sections.forEach((section, idx) => {
      if (!section || typeof section !== 'object') {
        issues.push(`Section ${idx + 1} is not a valid object`);
        score -= 10;
        return;
      }
      const sec = section as Record<string, unknown>;
      if (!sec.name || typeof sec.name !== 'string') {
        issues.push(`Section ${idx + 1} is missing a name`);
        score -= 5;
      }
      if (!Array.isArray(sec.items) || sec.items.length === 0) {
        warnings.push(`Section ${idx + 1} has no items`);
        score -= 3;
      }
    });
  }

  // Validate categories if present
  if (hasCategories) {
    const categories = obj.categories as Array<unknown>;
    categories.forEach((category, idx) => {
      if (!category || typeof category !== 'object') {
        issues.push(`Category ${idx + 1} is not a valid object`);
        score -= 10;
        return;
      }
      const cat = category as Record<string, unknown>;
      if (!cat.name || typeof cat.name !== 'string') {
        issues.push(`Category ${idx + 1} is missing a name`);
        score -= 5;
      }
    });
  }

  // Check for affirmation (nice to have but not required)
  if (!obj.affirmation || typeof obj.affirmation !== 'string' || obj.affirmation.trim().length === 0) {
    warnings.push('Missing affirmation message');
    score -= 5;
  }

  // Check for subtitle (nice to have)
  if (!obj.subtitle || typeof obj.subtitle !== 'string' || obj.subtitle.trim().length === 0) {
    warnings.push('Missing subtitle');
    score -= 5;
  }

  // Ensure score doesn't go below 0
  score = Math.max(0, score);

  return {
    passed: issues.length === 0 && score >= 60,
    score,
    issues,
    warnings,
  };
}

/**
 * Checks content quality beyond just schema validation
 */
export function checkContentQuality(content: ContentSchema, nicheId: string): QualityCheck {
  const issues: string[] = [];
  const warnings: string[] = [];
  let score = 100;

  // Check title quality
  if (content.title) {
    if (content.title.length > 100) {
      warnings.push('Title is very long (over 100 characters)');
      score -= 5;
    }
    if (content.title === content.title.toUpperCase() && content.title.length > 10) {
      warnings.push('Title is all uppercase');
      score -= 3;
    }
  }

  // Check content completeness
  let totalItems = 0;
  let emptyItems = 0;

  if (content.sections) {
    content.sections.forEach((section) => {
      if (section.items) {
        totalItems += section.items.length;
        section.items.forEach((item) => {
          if (!item || item.trim().length === 0) {
            emptyItems++;
          }
        });
      }
    });
  }

  if (totalItems > 0 && emptyItems / totalItems > 0.3) {
    issues.push('More than 30% of items are empty');
    score -= 20;
  }

  // Check for repeated content
  const allText = JSON.stringify(content).toLowerCase();
  if (content.sections && content.sections.length > 1) {
    const sectionNames = content.sections.map((s) => s.name.toLowerCase());
    const uniqueNames = new Set(sectionNames);
    if (uniqueNames.size < sectionNames.length) {
      warnings.push('Some section names are duplicated');
      score -= 10;
    }
  }

  // Check for niche relevance (basic keyword check)
  const nicheKeywords: Record<string, string[]> = {
    adhd: ['adhd', 'focus', 'executive', 'dopamine', 'attention', 'distraction', 'hyperfocus'],
    mdd: ['mood', 'depression', 'gratitude', 'therapy', 'mental health', 'self-care', 'wellness'],
    anxiety: ['anxiety', 'worry', 'calm', 'grounding', 'breathing', 'stress', 'panic', 'cbt'],
    social: ['social', 'conversation', 'boundary', 'communication', 'connection', 'relationship'],
    human: ['planner', 'goal', 'habit', 'productivity', 'organize', 'schedule'],
    techie: ['code', 'developer', 'sprint', 'agile', 'software', 'bug', 'review', 'tech'],
  };

  const keywords = nicheKeywords[nicheId] || [];
  const hasNicheKeywords = keywords.some((keyword) => allText.includes(keyword));

  if (!hasNicheKeywords && keywords.length > 0) {
    warnings.push(`Content may not be relevant to ${nicheId} niche`);
    score -= 15;
  }

  // Check for reasonable content length
  if (allText.length < 200) {
    issues.push('Content is too short (less than 200 characters)');
    score -= 25;
  }

  score = Math.max(0, score);

  return {
    passed: issues.length === 0 && score >= 70,
    score,
    issues,
    warnings,
  };
}

/**
 * Overall content validation combining schema and quality checks
 */
export function validateContent(content: unknown, nicheId: string): QualityCheck {
  // First check schema
  const schemaCheck = validateContentSchema(content);

  if (!schemaCheck.passed) {
    return schemaCheck;
  }

  // Then check quality
  const qualityCheck = checkContentQuality(content as ContentSchema, nicheId);

  // Combine results
  return {
    passed: schemaCheck.passed && qualityCheck.passed,
    score: Math.round((schemaCheck.score + qualityCheck.score) / 2),
    issues: [...schemaCheck.issues, ...qualityCheck.issues],
    warnings: [...schemaCheck.warnings, ...qualityCheck.warnings],
  };
}
