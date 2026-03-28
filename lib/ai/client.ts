import OpenAI from 'openai';
import { PROVIDERS, ProviderKey } from './providers';

export interface AISettings {
  provider: ProviderKey;
  geminiApiKey?: string;
  groqApiKey?: string;
  ollamaUrl?: string;
  ollamaModel?: string;
}

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
    client: new OpenAI({ apiKey, baseURL }),
    model,
    provider,
  };
}

export async function generateContent(
  prompt: string,
  settings?: AISettings
): Promise<string> {
  const { client, model } = createAIClient(settings);

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
    temperature: 0.7,
    max_tokens: 2000,
  });

  return response.choices[0]?.message?.content || '';
}
