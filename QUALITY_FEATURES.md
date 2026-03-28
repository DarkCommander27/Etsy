# Product Quality Features

This document describes the quality validation system implemented in EtsyGen to ensure high-quality AI-generated content.

## Overview

The quality system validates and scores AI-generated content across multiple dimensions:
- **Schema Validation**: Ensures content matches expected JSON structure
- **Content Quality**: Checks completeness, relevance, and coherence
- **Automatic Retry**: Re-generates content with different parameters if quality is low
- **User Feedback**: Shows quality scores and actionable suggestions in the UI

## Quality Scoring (0-100)

- **85-100**: Excellent - Ready for professional use
- **70-84**: Good - Minor improvements possible
- **60-69**: Acceptable - Some issues to address
- **Below 60**: Needs improvement - Content may be incomplete or invalid

## Validation Checks

### Schema Validation
- ✅ Valid JSON object structure
- ✅ Required `title` field present
- ✅ Main content structure (sections, categories, steps, or time_blocks)
- ✅ Proper data types for all fields
- ✅ Non-empty arrays where expected

### Content Quality Checks
- ✅ Title length (3-100 characters optimal)
- ✅ Content completeness (checks for empty items)
- ✅ No duplicate section names
- ✅ Niche relevance (keyword matching)
- ✅ Minimum content length (200+ characters)
- ✅ Presence of affirmation and subtitle

## Automatic Retry Logic

If AI generates low-quality content, the system automatically retries with different parameters:

1. **Attempt 1**: Temperature 0.7 (balanced creativity)
2. **Attempt 2**: Temperature 0.5 (more focused/deterministic)
3. **Attempt 3**: Temperature 0.9 (more creative/varied)

The system:
- Tries up to 3 times automatically
- Keeps the best result across all attempts
- Stops early if it gets high-quality content (score ≥ 85)
- Returns quality metadata with the response

## User Interface

### Quality Indicator Card

When content is generated, users see a quality card showing:

- **Quality Score**: 0-100 with visual indicator (🌟 Excellent, ✅ Good, ⚠️ Acceptable)
- **Status Badge**: Color-coded (green/blue/yellow)
- **Issues**: Critical problems that should be fixed
- **Suggestions**: Optional improvements

### Example Quality Feedback

```
🌟 Quality Score: 92/100
Status: Excellent

✨ Your content meets high-quality standards and is ready for professional use!
```

Or with issues:

```
⚠️ Quality Score: 65/100
Status: Acceptable

Issues:
• More than 30% of items are empty
• Content is too short (less than 200 characters)

Suggestions:
• Missing affirmation message
• Title is very short (less than 3 characters)
```

## API Response Format

The `/api/generate-content` endpoint now returns:

```json
{
  "content": { ... },
  "quality": {
    "score": 92,
    "passed": true,
    "issues": [],
    "warnings": ["Missing subtitle"]
  },
  "attempts": [
    { "attempt": 1, "score": 92, "issues": [] }
  ]
}
```

## Niche-Specific Keywords

The system validates niche relevance using keyword matching:

- **ADHD**: adhd, focus, executive, dopamine, attention, distraction, hyperfocus
- **MDD**: mood, depression, gratitude, therapy, mental health, self-care, wellness
- **Anxiety**: anxiety, worry, calm, grounding, breathing, stress, panic, cbt
- **Social**: social, conversation, boundary, communication, connection, relationship
- **General**: planner, goal, habit, productivity, organize, schedule
- **Techie**: code, developer, sprint, agile, software, bug, review, tech

Content that doesn't include any niche keywords receives a warning.

## Code Architecture

### Files Modified/Created

1. **`lib/ai/quality.ts`** (NEW)
   - `validateContentSchema()`: Schema validation
   - `checkContentQuality()`: Content quality checks
   - `validateContent()`: Combined validation

2. **`app/api/generate-content/route.ts`** (UPDATED)
   - Retry loop with multiple attempts
   - Temperature variation strategy
   - Quality tracking across attempts

3. **`lib/ai/client.ts`** (UPDATED)
   - Added `temperature` parameter to `generateContent()`

4. **`app/generate/page.tsx`** (UPDATED)
   - Quality state management
   - Quality indicator UI component
   - Visual feedback for scores/issues

## Benefits

1. **Higher Quality Products**: Automated validation catches issues before users see them
2. **Better User Experience**: Clear feedback on what to improve
3. **Reduced Manual Editing**: Retry logic means better first results
4. **Professional Standards**: Quality thresholds ensure sellable products
5. **Learning System**: Users understand what makes quality content

## Future Enhancements

Potential improvements to consider:

- [ ] Allow users to set custom quality thresholds
- [ ] Add a "Regenerate" button for low-quality results
- [ ] Track quality metrics over time (analytics)
- [ ] Model-specific quality profiles (Gemini vs Groq vs Ollama)
- [ ] AI-powered quality suggestions ("Try adding more...")
- [ ] Export quality reports for batch generation
- [ ] A/B testing different prompts based on quality scores
