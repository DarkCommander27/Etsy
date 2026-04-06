import OpenAI from 'openai';
import { PROVIDERS, ProviderKey } from './providers';

const AI_REQUEST_TIMEOUT_MS = 60_000;
// No SDK-level retries — our model fallback chain handles reliability explicitly.
const AI_MAX_RETRIES = 0;

export interface AISettings {
  provider?: string;
  geminiApiKey?: string;
  geminiModel?: string;
  groqApiKey?: string;
  groqModel?: string;
  ollamaUrl?: string;
  ollamaModel?: string;
}

export type GenerationMode = 'product' | 'listing';

export class AIProviderError extends Error {
  status: number;
  provider: string;
  model: string;

  constructor(message: string, status: number, provider: string, model: string) {
    super(message);
    this.name = 'AIProviderError';
    this.status = status;
    this.provider = provider;
    this.model = model;
  }
}

function getProviderConfig(settings?: AISettings) {
  const requestedProvider = settings?.provider || process.env.DEFAULT_AI_PROVIDER || 'gemini';

  if (!(requestedProvider in PROVIDERS)) {
    throw new AIProviderError(
      `Unsupported AI provider "${requestedProvider}". Choose one of: ${Object.keys(PROVIDERS).join(', ')}.`,
      400,
      requestedProvider,
      'unknown'
    );
  }

  const provider = requestedProvider as ProviderKey;
  const config = PROVIDERS[provider];

  let apiKey: string;
  let baseURL: string = config.baseURL;

  if (provider === 'gemini') {
    apiKey = settings?.geminiApiKey || process.env.GEMINI_API_KEY || '';
  } else if (provider === 'groq') {
    apiKey = settings?.groqApiKey || process.env.GROQ_API_KEY || '';
  } else {
    apiKey = 'ollama';
    baseURL = settings?.ollamaUrl || config.baseURL;
  }

  const model =
    provider === 'ollama'
      ? settings?.ollamaModel || config.model
      : provider === 'gemini'
        ? settings?.geminiModel || process.env.GEMINI_MODEL || config.model
        : provider === 'groq'
          ? settings?.groqModel || process.env.GROQ_MODEL || config.model
          : config.model;

  return {
    provider,
    model,
    apiKey,
    baseURL,
  };
}

function formatProviderError(
  err: unknown,
  provider: ProviderKey,
  model: string
): AIProviderError {
  const status =
    typeof err === 'object' && err !== null && 'status' in err && typeof (err as { status?: unknown }).status === 'number'
      ? ((err as { status: number }).status)
      : 502;

  const message =
    typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: unknown }).message === 'string'
      ? (err as { message: string }).message
      : 'Unknown AI provider error.';

  const fallback = `AI request failed (${provider}/${model}).`;
  const normalizedMessage = message.toLowerCase().includes('no body')
    ? `${fallback} Provider returned an empty error body. Check API key validity, model access, and billing/quota.`
    : `${fallback} ${message}`;

  return new AIProviderError(normalizedMessage, status, provider, model);
}

function isGroqRetryableError(err: unknown): boolean {
  const status =
    typeof err === 'object' && err !== null && 'status' in err && typeof (err as { status?: unknown }).status === 'number'
      ? (err as { status: number }).status
      : 0;
  const message =
    typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: unknown }).message === 'string'
      ? (err as { message: string }).message.toLowerCase()
      : '';

  if (status === 429) return true; // rate limited — try next model

  if ([400, 404, 503].includes(status)) {
    return [
      'model',
      'not found',
      'not available',
      'does not exist',
      'unsupported',
      'no body',
      'invalid',
    ].some((needle) => message.includes(needle));
  }

  return false;
}

function isGeminiRetryableModelError(err: unknown): boolean {
  const status =
    typeof err === 'object' && err !== null && 'status' in err && typeof (err as { status?: unknown }).status === 'number'
      ? (err as { status: number }).status
      : 0;
  const message =
    typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: unknown }).message === 'string'
      ? (err as { message: string }).message.toLowerCase()
      : '';

  if (![400, 404, 429, 503].includes(status)) return false;

  return [
    'no body',
    'model',
    'not found',
    'unsupported',
    'quota',
    'permission',
    'access',
  ].some((needle) => message.includes(needle));
}

export function createAIClient(settings?: AISettings) {
  const { provider, model, apiKey, baseURL } = getProviderConfig(settings);

  if ((provider === 'gemini' || provider === 'groq') && !apiKey) {
    const keyLabel = provider === 'gemini' ? 'Gemini API key' : 'Groq API key';
    throw new AIProviderError(
      `${keyLabel} is missing. Add it in Settings or set the environment variable.`,
      400,
      provider,
      model
    );
  }

  return {
    client: new OpenAI({ apiKey, baseURL, timeout: AI_REQUEST_TIMEOUT_MS, maxRetries: AI_MAX_RETRIES }),
    model,
    provider,
  };
}

export async function generateContent(
  prompt: string,
  settings?: AISettings,
  mode: GenerationMode = 'product'
): Promise<string> {
  const { client, model, provider } = createAIClient(settings);
  const temperature = mode === 'listing' ? 0.4 : 0.75;
  const maxTokens = mode === 'listing' ? 1800 : 3000;

  const systemContent =
    mode === 'product'
      ? `You create premium printable digital products for Etsy buyers who paid real money. They expect specific, immediately usable content — not templates, not placeholders, not motivational filler.

WHAT MAKES AI SLOP (never produce these):
- "Win #1:" — a bare label, tells the buyer nothing
- "Task: ___" or "Step 2: _________________________" — an unfilled template skeleton
- "Activity:" — single word plus colon, gives no instruction
- "Do something good for yourself" — so vague any printable would say it
- "You've got this!" — hollow filler with no connection to what's on the page

WHAT MAKES QUALITY CONTENT (model your output on these):
- "What's one win from today's work, even if it felt small?" — complete, invites real reflection
- "Name the exact thing making your chest tight right now." — grounded, actionable
- "Write the task you've avoided longest — then write the absolute smallest first step." — two-part, forces action
- "Go outside for 5 minutes, no phone. Come back and write one thing you noticed." — instruction plus follow-up
- Closing: "Every entry here is evidence you showed up. That matters more than perfection." — specific to the product

RULES:
1. JSON template values are structural scaffolding — replace EVERY value with specific, original content.
2. No item that is just a label followed by a colon ("Habit 1:", "Goal:", "Category:").
3. No item under 5 meaningful words unless it is a checkbox label in an explicit fill-in tracker.
4. No two items conveying the same idea in different words.
5. Return raw JSON only — no markdown fences, no commentary, nothing outside the JSON object.`
  : `You write Etsy listing copy for real buyers spending real money. The listing must sound specific, credible, and useful — never like AI sludge, SEO spam, or vague marketing fluff.

NEVER WRITE THIS KIND OF COPY:
- "perfect for everyone"
- "must-have"
- "high quality product"
- "beautifully designed"
- "great gift"
- repeated sentences that keep saying the same thing with different adjectives
- filler claims with no product detail, like "stay organized and inspired" or "transform your life"

REQUIREMENTS:
1. Every sentence in the description must add NEW information.
2. Be concrete about what the buyer gets, who it is for, how they use it, and what makes it useful.
3. Use natural SEO keywords, but do not stuff or repeat them mechanically.
4. Avoid generic hype, empty adjectives, and salesy nonsense.
5. Return valid JSON only when asked — no markdown fences, no commentary.`;

  // Groq fallback chain: try each model in order until one succeeds.
  // Covers both rate-limit (429) and model-unavailable (404/400/503) errors.
  const GROQ_FALLBACK_CHAIN = [
    'llama-3.3-70b-versatile',
    'openai/gpt-oss-20b',
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'llama-3.1-8b-instant', // always-available last resort
  ];
  const modelCandidates =
    provider === 'gemini'
      ? Array.from(new Set([model, 'gemini-1.5-flash']))
      : provider === 'groq'
        ? Array.from(new Set([model, ...GROQ_FALLBACK_CHAIN]))
        : [model];

  let lastErr: unknown;

  for (let i = 0; i < modelCandidates.length; i += 1) {
    const candidateModel = modelCandidates[i];
    try {
      const response = await client.chat.completions.create({
        model: candidateModel,
        messages: [
          {
            role: 'system',
            content: systemContent,
          },
          { role: 'user', content: prompt },
        ],
        temperature,
        max_tokens: maxTokens,
      });

      return response.choices[0]?.message?.content || '';
    } catch (err) {
      lastErr = err;
      const errStatus =
        typeof err === 'object' && err !== null && 'status' in err && typeof (err as { status?: unknown }).status === 'number'
          ? (err as { status: number }).status
          : 0;

      const canRetryWithNextModel =
        i < modelCandidates.length - 1 &&
        (
          (provider === 'gemini' && isGeminiRetryableModelError(err)) ||
          (provider === 'groq' && isGroqRetryableError(err))
        );

      if (!canRetryWithNextModel) {
        throw formatProviderError(err, provider, candidateModel);
      }

      const reason = errStatus === 429 ? '429 rate-limit' : `${errStatus} model unavailable`;
      console.warn(`[ai/client] ${provider}/${candidateModel} failed (${reason}), trying ${modelCandidates[i + 1]}`);
    }
  }

  throw formatProviderError(lastErr, provider, modelCandidates[modelCandidates.length - 1]);
}
