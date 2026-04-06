export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function readRequestJson<T>(request: Request): Promise<{ ok: true; data: T } | { ok: false }> {
  try {
    return { ok: true, data: await request.json() as T };
  } catch {
    return { ok: false };
  }
}

export function getApiErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') {
    return fallback;
  }

  const record = data as Record<string, unknown>;
  const error = typeof record.error === 'string' && record.error.trim()
    ? record.error
    : fallback;
  const details = Array.isArray(record.details)
    ? record.details.filter((detail): detail is string => typeof detail === 'string' && detail.trim().length > 0)
    : [];

  return [error, ...details].join(' ');
}

export async function readJsonResponse<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
