import { describe, it, expect } from 'vitest';
import { getCachedDino, setCachedDino, type CachedDino } from './cache';
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

describe('cache', () => {
  it('returns null when the key is not cached', async () => {
    const kv = createFakeKV();
    const result = await getCachedDino(kv, 'missing-key');
    expect(result).toBeNull();
  });

  it('round-trips a cached dino', async () => {
    const kv = createFakeKV();
    const dino: CachedDino = {
      scientificName: 'Volcanius ferox',
      commonName: 'Volcanrex',
      description: 'Un dinosaurio feroz que vive en volcanes.',
      imageKey: 'abc123',
    };
    await setCachedDino(kv, 'abc123', dino);
    const result = await getCachedDino(kv, 'abc123');
    expect(result).toEqual(dino);
  });
});
