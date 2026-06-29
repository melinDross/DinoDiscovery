import { describe, it, expect } from 'vitest';
import { onRequestGet } from './confirm';
import { saveResult, getResult } from '../lib/results';

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
    emailConfirmed: false,
  };
}

function createEnv() {
  return { RESULTS_KV: createFakeKV(), KIT_WEBHOOK_SECRET: 'shh-secret' };
}

function createRequest(resultId: string, secret = 'shh-secret') {
  return new Request(
    `https://example.com/api/confirm?resultId=${resultId}&secret=${secret}`
  );
}

describe('onRequestGet /api/confirm', () => {
  it('returns 401 when the secret query param does not match', async () => {
    const env = createEnv();
    const response = await onRequestGet({ request: createRequest('result-1', 'wrong'), env } as any);
    expect(response.status).toBe(401);
  });

  it('marks the result as emailConfirmed and redirects to /r/:id', async () => {
    const env = createEnv();
    await saveResult(env.RESULTS_KV, 'result-1', createRecord());

    const response = await onRequestGet({ request: createRequest('result-1'), env } as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/r/result-1');
    const updated = await getResult(env.RESULTS_KV, 'result-1');
    expect(updated?.emailConfirmed).toBe(true);
  });

  it('still redirects (no-op) when the resultId does not exist', async () => {
    const env = createEnv();
    const response = await onRequestGet({ request: createRequest('missing'), env } as any);
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/r/missing');
  });

  it('returns 400 when resultId is missing from the query string', async () => {
    const env = createEnv();
    const response = await onRequestGet({
      request: new Request('https://example.com/api/confirm?secret=shh-secret'),
      env,
    } as any);
    expect(response.status).toBe(400);
  });
});
