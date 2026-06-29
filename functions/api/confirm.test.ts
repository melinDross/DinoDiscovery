import { describe, it, expect } from 'vitest';
import { onRequestGet } from './confirm';
import { saveResult, setResultEmail, getResult } from '../lib/results';

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
    email: null,
    emailConfirmed: false,
  };
}

function createEnv() {
  return { RESULTS_KV: createFakeKV(), KIT_WEBHOOK_SECRET: 'shh-secret' };
}

function createRequest(email: string, secret = 'shh-secret') {
  return new Request(
    `https://example.com/api/confirm?secret=${secret}&email=${encodeURIComponent(email)}&first_name=Nina&id=12345`
  );
}

describe('onRequestGet /api/confirm', () => {
  it('returns 401 when the secret query param does not match', async () => {
    const env = createEnv();
    const response = await onRequestGet({
      request: createRequest('nina@example.com', 'wrong'),
      env,
    } as any);
    expect(response.status).toBe(401);
  });

  it('marks the matching result as emailConfirmed and redirects to it', async () => {
    const env = createEnv();
    await saveResult(env.RESULTS_KV, 'result-1', createRecord());
    await setResultEmail(env.RESULTS_KV, 'result-1', 'nina@example.com');

    const response = await onRequestGet({ request: createRequest('nina@example.com'), env } as any);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/r/result-1');
    const updated = await getResult(env.RESULTS_KV, 'result-1');
    expect(updated?.emailConfirmed).toBe(true);
  });

  it('redirects to the most recent result when the email has several pending discoveries', async () => {
    const env = createEnv();
    await saveResult(env.RESULTS_KV, 'result-1', createRecord());
    await saveResult(env.RESULTS_KV, 'result-2', createRecord());
    await setResultEmail(env.RESULTS_KV, 'result-1', 'nina@example.com');
    await setResultEmail(env.RESULTS_KV, 'result-2', 'nina@example.com');

    const response = await onRequestGet({ request: createRequest('nina@example.com'), env } as any);

    expect(response.headers.get('Location')).toBe('/r/result-2');
  });

  it('redirects to the home page when no result is pending for that email', async () => {
    const env = createEnv();
    const response = await onRequestGet({
      request: createRequest('unknown@example.com'),
      env,
    } as any);
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/');
  });

  it('returns 400 when email is missing from the query string', async () => {
    const env = createEnv();
    const response = await onRequestGet({
      request: new Request('https://example.com/api/confirm?secret=shh-secret'),
      env,
    } as any);
    expect(response.status).toBe(400);
  });
});
