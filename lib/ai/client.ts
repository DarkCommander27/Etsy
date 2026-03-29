import OpenAI from 'openai';
import { PROVIDERS, ProviderKey } from './providers';

const AI_REQUEST_TIMEOUT_MS = 30_000;
const AI_MAX_RETRIES = 2;

export interface AISettings {
  provider: ProviderKey;
  geminiApiKey?: string;
  groqApiKey?: string;
  ollamaUrl?: string;
  ollamaModel?: string;
}

export type GenerationMode = 'product' | 'listing';

export function createAIClient(settings?: AISettings) {
  const provider = (settings?.provider ||
    (process.env.DEFAULT_AI_PROVIDER as ProviderKey) ||
    'gemini') as ProviderKey;
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
  const { client, model } = createAIClient(settings);
  const temperature = mode === 'listing' ? 0.3 : 0.4;
  const maxTokens = mode === 'listing' ? 1400 : 2200;

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
}
