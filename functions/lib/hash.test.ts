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
});
