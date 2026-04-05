import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSettings } from './settings';

function createLocalStorageMock(value: string | null) {
  return {
    getItem: vi.fn(() => value),
  } as unknown as Storage;
}

describe('getSettings', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns parsed settings from localStorage', () => {
    vi.stubGlobal('localStorage', createLocalStorageMock('{"provider":"gemini","defaultPageSize":"a4"}'));

    expect(getSettings()).toEqual({ provider: 'gemini', defaultPageSize: 'a4' });
  });

  it('returns an empty object when storage is missing or invalid', () => {
    vi.stubGlobal('localStorage', createLocalStorageMock('{invalid json'));

    expect(getSettings()).toEqual({});
  });
});