export const PROVIDERS = {
  gemini: {
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    model: 'gemini-2.0-flash',
    name: 'Google Gemini (Free)',
    keyEnv: 'GEMINI_API_KEY',
  },
  groq: {
    baseURL: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    name: 'Groq (Free)',
    keyEnv: 'GROQ_API_KEY',
  },
  ollama: {
    baseURL: 'http://localhost:11434/v1',
    model: 'llama3',
    name: 'Ollama (Local)',
    keyEnv: null,
  },
} as const;

export type ProviderKey = keyof typeof PROVIDERS;
