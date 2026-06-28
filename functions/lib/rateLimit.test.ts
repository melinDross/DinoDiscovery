import { describe, it, expect, beforeEach } from 'vitest';
import { checkAndIncrementRateLimit, type KVLike } from './rateLimit';

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

describe('checkAndIncrementRateLimit', () => {
  let kv: KVLike;

  beforeEach(() => {
    kv = createFakeKV();
  });

  it('allows the first 5 requests from an IP', async () => {
    for (let i = 0; i < 5; i++) {
      const result = await checkAndIncrementRateLimit(kv, '1.2.3.4');
      expect(result.allowed).toBe(true);
    }
  });

  it('rejects the 6th request from the same IP within the window', async () => {
    for (let i = 0; i < 5; i++) {
      await checkAndIncrementRateLimit(kv, '1.2.3.4');
    }
    const result = await checkAndIncrementRateLimit(kv, '1.2.3.4');
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('tracks different IPs independently', async () => {
    for (let i = 0; i < 5; i++) {
      await checkAndIncrementRateLimit(kv, '1.1.1.1');
    }
    const result = await checkAndIncrementRateLimit(kv, '2.2.2.2');
    expect(result.allowed).toBe(true);
  });
});
