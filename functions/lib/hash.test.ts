import { describe, it, expect } from 'vitest';
import { computeCacheKey } from './hash';
import type { DinoAttributes } from '../../shared/types';

const baseAttrs: DinoAttributes = {
  size: 'Gigante',
  habitat: 'Volcán',
  diet: 'Carnívoro',
  feature: 'Cuernos',
  personality: 'Feroz',
};

describe('computeCacheKey', () => {
  it('produces the same key for identical attributes', async () => {
    const a = await computeCacheKey(baseAttrs);
    const b = await computeCacheKey({ ...baseAttrs });
    expect(a).toBe(b);
  });

  it('produces a different key when an attribute changes', async () => {
    const a = await computeCacheKey(baseAttrs);
    const b = await computeCacheKey({ ...baseAttrs, size: 'Pequeño' });
    expect(a).not.toBe(b);
  });

  it('returns a 64-character hex string (SHA-256)', async () => {
    const key = await computeCacheKey(baseAttrs);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it('includes a version marker so prompt/format changes can invalidate old cache entries', async () => {
    const key = await computeCacheKey(baseAttrs);
    // Recompute what the un-versioned key would have been, to prove the
    // versioned key differs from it (i.e. the version string actually
    // participates in the hash input, not just appended after hashing).
    const unversionedCanonical = [
      baseAttrs.size,
      baseAttrs.habitat,
      baseAttrs.diet,
      baseAttrs.feature,
      baseAttrs.personality,
    ].join('|');
    const data = new TextEncoder().encode(unversionedCanonical);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const unversionedKey = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    expect(key).not.toBe(unversionedKey);
  });
});
