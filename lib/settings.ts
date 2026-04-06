/**
 * Reads the persisted settings object from localStorage.
 * Safe to call on the client side only.
 */
export function getSettings(): Record<string, unknown> {
  try {
    return JSON.parse(localStorage.getItem('etsygen-settings') || '{}');
  } catch {
    return {};
  }
}

export function getSafeSearchParam(value: string | null): string {
  return typeof value === 'string' ? value : '';
}
