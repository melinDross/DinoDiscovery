import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
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

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows the first 3 requests from an IP', async () => {
    for (let i = 0; i < 3; i++) {
      const result = await checkAndIncrementRateLimit(kv, '1.2.3.4');
      expect(result.allowed).toBe(true);
    }
  });

  it('rejects the 4th request from the same IP within the window', async () => {
    for (let i = 0; i < 3; i++) {
      await checkAndIncrementRateLimit(kv, '1.2.3.4');
    }
    const result = await checkAndIncrementRateLimit(kv, '1.2.3.4');
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('tracks different IPs independently', async () => {
    for (let i = 0; i < 3; i++) {
      await checkAndIncrementRateLimit(kv, '1.1.1.1');
    }
    const result = await checkAndIncrementRateLimit(kv, '2.2.2.2');
    expect(result.allowed).toBe(true);
  });

  it('allows requests again once the window has fully elapsed', async () => {
    vi.useFakeTimers();
    const start = new Date('2026-01-01T00:00:00Z');
    vi.setSystemTime(start);

    for (let i = 0; i < 3; i++) {
      await checkAndIncrementRateLimit(kv, '5.5.5.5');
    }
    expect((await checkAndIncrementRateLimit(kv, '5.5.5.5')).allowed).toBe(false);

    vi.setSystemTime(new Date(start.getTime() + 3601 * 1000));
    const result = await checkAndIncrementRateLimit(kv, '5.5.5.5');
    expect(result.allowed).toBe(true);
  });

  it('returns retryAfterSeconds reflecting the real remaining window, not always the full hour', async () => {
    vi.useFakeTimers();
    const start = new Date('2026-01-01T00:00:00Z');
    vi.setSystemTime(start);

    for (let i = 0; i < 3; i++) {
      await checkAndIncrementRateLimit(kv, '7.7.7.7');
    }

    vi.setSystemTime(new Date(start.getTime() + 1800 * 1000));
    const result = await checkAndIncrementRateLimit(kv, '7.7.7.7');
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(1800);
    expect(result.retryAfterSeconds).toBeGreaterThan(1700);
  });
});
