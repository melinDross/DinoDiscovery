import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { checkAndIncrementGlobalBudget } from './globalBudget';
import type { KVLike } from './rateLimit';

function createFakeKV(): KVLike {
  const store = new Map<string, string>();
  return {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe('checkAndIncrementGlobalBudget', () => {
  let kv: KVLike;

  beforeEach(() => {
    kv = createFakeKV();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows the first 30 generations of the day', async () => {
    for (let i = 0; i < 30; i++) {
      const result = await checkAndIncrementGlobalBudget(kv);
      expect(result.allowed).toBe(true);
    }
  });

  it('rejects the 31st generation of the same UTC day', async () => {
    for (let i = 0; i < 30; i++) {
      await checkAndIncrementGlobalBudget(kv);
    }
    const result = await checkAndIncrementGlobalBudget(kv);
    expect(result.allowed).toBe(false);
  });

  it('allows generations again on a new UTC day', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T23:00:00Z'));

    for (let i = 0; i < 30; i++) {
      await checkAndIncrementGlobalBudget(kv);
    }
    expect((await checkAndIncrementGlobalBudget(kv)).allowed).toBe(false);

    vi.setSystemTime(new Date('2026-01-02T00:00:01Z'));
    const result = await checkAndIncrementGlobalBudget(kv);
    expect(result.allowed).toBe(true);
  });
});
