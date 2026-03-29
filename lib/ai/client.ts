import OpenAI from 'openai';
import { PROVIDERS, ProviderKey } from './providers';

const AI_REQUEST_TIMEOUT_MS = 30_000;
const AI_MAX_RETRIES = 2;

export interface AISettings {
  provider?: string;
  geminiApiKey?: string;
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

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that creates content for printable digital products sold on Etsy. Always return valid JSON when asked.',
        },
        { role: 'user', content: prompt },
      ],
      temperature,
      max_tokens: maxTokens,
    });

    return response.choices[0]?.message?.content || '';
  } catch (err) {
    throw formatProviderError(err, provider, model);
  }
}
