import OpenAI from 'openai';
import { PROVIDERS, ProviderKey } from './providers';

const AI_REQUEST_TIMEOUT_MS = 30_000;
const AI_MAX_RETRIES = 2;

export interface AISettings {
  provider?: string;
  geminiApiKey?: string;
  geminiModel?: string;
  groqApiKey?: string;
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
  const temperature = mode === 'listing' ? 0.3 : 0.4;
  const maxTokens = mode === 'listing' ? 1400 : 2200;

  const systemContent =
    mode === 'product'
      ? 'You are a helpful assistant that creates content for printable digital products sold on Etsy. Always return valid JSON when asked. Output should be practical and substantial, not minimal: include clear instructions, rich detail, and complete sections/items based on the requested schema.'
      : 'You are a helpful assistant that creates Etsy listing copy. Always return valid JSON when asked. Avoid generic copy: use specific keywords, concrete product details, and complete fields with strong depth.';

  const modelCandidates =
    provider === 'gemini'
      ? Array.from(new Set([model, 'gemini-1.5-flash']))
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
      const canRetryWithNextModel =
        provider === 'gemini' &&
        i < modelCandidates.length - 1 &&
        isGeminiRetryableModelError(err);

      if (!canRetryWithNextModel) {
        throw formatProviderError(err, provider, candidateModel);
      }
    }
  }

  throw formatProviderError(lastErr, provider, modelCandidates[modelCandidates.length - 1]);
}
