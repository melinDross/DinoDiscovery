import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/kit', () => ({
  subscribeToKitForm: vi.fn(),
}));

import { onRequestPost } from './subscribe';
import { subscribeToKitForm } from '../lib/kit';
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
    email: null,
  };
}

function createEnv() {
  return {
    RATE_LIMIT_KV: createFakeKV(),
    RESULTS_KV: createFakeKV(),
    KIT_API_KEY: 'fake-kit-key',
    KIT_FORM_ID: 'form-42',
  };
}

function createRequest(body: unknown, ip = '1.2.3.4') {
  return new Request('https://example.com/api/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'CF-Connecting-IP': ip },
    body: JSON.stringify(body),
  });
}

describe('onRequestPost /api/subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(subscribeToKitForm).mockResolvedValue(undefined);
  });

  it('returns 404 when the resultId does not exist', async () => {
    const env = createEnv();
    const response = await onRequestPost({
      request: createRequest({ resultId: 'missing', email: 'nina@example.com' }),
      env,
    } as any);
    expect(response.status).toBe(404);
  });

  it('returns 400 for an invalid email', async () => {
    const env = createEnv();
    await saveResult(env.RESULTS_KV, 'result-1', createRecord());
    const response = await onRequestPost({
      request: createRequest({ resultId: 'result-1', email: 'not-an-email' }),
      env,
    } as any);
    expect(response.status).toBe(400);
    expect(subscribeToKitForm).not.toHaveBeenCalled();
  });

  it('subscribes via Kit and stores the email on the result record', async () => {
    const env = createEnv();
    await saveResult(env.RESULTS_KV, 'result-1', createRecord());
    const response = await onRequestPost({
      request: createRequest({ resultId: 'result-1', email: 'nina@example.com' }),
      env,
    } as any);

    expect(response.status).toBe(200);
    expect(subscribeToKitForm).toHaveBeenCalledWith(
      'nina@example.com',
      'result-1',
      { apiKey: 'fake-kit-key', formId: 'form-42' }
    );
    const stored = await getResult(env.RESULTS_KV, 'result-1');
    expect(stored?.email).toBe('nina@example.com');
  });

  it('returns 502 when the Kit API call fails', async () => {
    const env = createEnv();
    await saveResult(env.RESULTS_KV, 'result-1', createRecord());
    vi.mocked(subscribeToKitForm).mockRejectedValueOnce(new Error('Kit API error: 422'));

    const response = await onRequestPost({
      request: createRequest({ resultId: 'result-1', email: 'nina@example.com' }),
      env,
    } as any);
    expect(response.status).toBe(502);
  });

  it('returns 429 after exceeding the rate limit for an IP', async () => {
    const env = createEnv();
    await saveResult(env.RESULTS_KV, 'result-1', createRecord());
    for (let i = 0; i < 5; i++) {
      await onRequestPost({
        request: createRequest({ resultId: 'result-1', email: 'nina@example.com' }, '9.9.9.9'),
        env,
      } as any);
    }
    const response = await onRequestPost({
      request: createRequest({ resultId: 'result-1', email: 'nina@example.com' }, '9.9.9.9'),
      env,
    } as any);
    expect(response.status).toBe(429);
  });
});
