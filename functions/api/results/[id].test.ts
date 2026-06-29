import { describe, it, expect } from 'vitest';
import { onRequestGet } from './[id]';
import { saveResult } from '../../lib/results';

function createFakeKV() {
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

function createRecord() {
  return {
    scientificName: 'Volcanius ferox',
    commonName: 'Volcanrex',
    description: 'Un dinosaurio feroz que vive en volcanes.',
    imageKey: 'abc123',
    discovererName: 'Lucía',
    attrs: {
      size: 'Gigante' as const,
      habitat: 'Volcán' as const,
      diet: 'Carnívoro' as const,
      feature: 'Cuernos' as const,
      personality: 'Feroz' as const,
    },
    createdAt: 1000,
    email: 'nina@example.com',
  };
}

describe('onRequestGet /api/results/:id', () => {
  it('returns 404 when the resultId does not exist', async () => {
    const env = { RESULTS_KV: createFakeKV() };
    const response = await onRequestGet({ params: { id: 'missing' }, env } as any);
    expect(response.status).toBe(404);
  });

  it('returns the public result fields without exposing the email', async () => {
    const env = { RESULTS_KV: createFakeKV() };
    await saveResult(env.RESULTS_KV, 'result-1', createRecord());

    const response = await onRequestGet({ params: { id: 'result-1' }, env } as any);
    expect(response.status).toBe(200);
    const json = (await response.json()) as any;
    expect(json).toEqual({
      scientificName: 'Volcanius ferox',
      commonName: 'Volcanrex',
      description: 'Un dinosaurio feroz que vive en volcanes.',
      imageUrl: '/images/abc123.png',
      discovererName: 'Lucía',
    });
    expect(json.email).toBeUndefined();
  });
});
