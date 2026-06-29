import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/anthropic', () => ({
  generateDinoText: vi.fn(),
}));
vi.mock('../lib/openai', () => ({
  generateDinoImage: vi.fn(),
}));
vi.mock('../lib/r2', () => ({
  storeImageInR2: vi.fn(),
}));

import { onRequestPost } from './generate-dino';
import { generateDinoText } from '../lib/anthropic';
import { generateDinoImage } from '../lib/openai';
import { storeImageInR2 } from '../lib/r2';

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

function createEnv() {
  return {
    RATE_LIMIT_KV: createFakeKV(),
    CACHE_KV: createFakeKV(),
    RESULTS_KV: createFakeKV(),
    DINO_IMAGES: { put: vi.fn() },
    ANTHROPIC_API_KEY: 'fake-anthropic-key',
    OPENAI_API_KEY: 'fake-openai-key',
    ADMIN_KEY: 'super-secret-admin-key',
  };
}

const validBody = {
  size: 'Gigante',
  habitat: 'Volcán',
  diet: 'Carnívoro',
  feature: 'Cuernos',
  personality: 'Feroz',
  discovererName: 'Lucía',
};

function createRequest(body: unknown, ip = '1.2.3.4', adminKey?: string) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'CF-Connecting-IP': ip,
  };
  if (adminKey) {
    headers['X-Admin-Key'] = adminKey;
  }
  return new Request('https://example.com/api/generate-dino', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

describe('onRequestPost /api/generate-dino', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateDinoText).mockResolvedValue({
      scientificName: 'Volcanius ferox',
      commonName: 'Volcanrex',
      description: 'Un dinosaurio feroz que vive en volcanes.',
    });
    vi.mocked(generateDinoImage).mockResolvedValue('ZmFrZS1pbWFnZS1ieXRlcw==');
    vi.mocked(storeImageInR2).mockResolvedValue(undefined);
  });

  it('returns 429 when the IP has exceeded the rate limit', async () => {
    const env = createEnv();
    for (let i = 0; i < 5; i++) {
      await onRequestPost({ request: createRequest(validBody), env } as any);
    }
    const response = await onRequestPost({ request: createRequest(validBody), env } as any);
    expect(response.status).toBe(429);
    const json = (await response.json()) as any;
    expect(json.error).toBe('RATE_LIMITED');
  });

  it('bypasses the rate limit when a valid X-Admin-Key header is sent', async () => {
    const env = createEnv();
    for (let i = 0; i < 7; i++) {
      const response = await onRequestPost({
        request: createRequest(validBody, '1.2.3.4', env.ADMIN_KEY),
        env,
      } as any);
      expect(response.status).toBe(200);
    }
  });

  it('does not bypass the rate limit when the X-Admin-Key header is wrong', async () => {
    const env = createEnv();
    for (let i = 0; i < 5; i++) {
      await onRequestPost({
        request: createRequest(validBody, '9.8.7.6', 'totally-wrong-key'),
        env,
      } as any);
    }
    const response = await onRequestPost({
      request: createRequest(validBody, '9.8.7.6', 'totally-wrong-key'),
      env,
    } as any);
    expect(response.status).toBe(429);
  });

  it('returns 400 when attributes are invalid', async () => {
    const env = createEnv();
    const response = await onRequestPost({
      request: createRequest({ ...validBody, size: 'NotASize' }),
      env,
    } as any);
    expect(response.status).toBe(400);
  });

  it('generates a new dino on cache miss and returns it', async () => {
    const env = createEnv();
    const response = await onRequestPost({ request: createRequest(validBody), env } as any);
    expect(response.status).toBe(200);
    const json = (await response.json()) as any;
    expect(json.scientificName).toBe('Volcanius ferox');
    expect(json.imageUrl).toMatch(/^\/images\/.+\.png$/);
    expect(generateDinoText).toHaveBeenCalledTimes(1);
    expect(generateDinoImage).toHaveBeenCalledTimes(1);
    expect(storeImageInR2).toHaveBeenCalledTimes(1);
  });

  it('calls generateDinoText and generateDinoImage in parallel, not sequentially', async () => {
    const env = createEnv();
    const callOrder: string[] = [];
    vi.mocked(generateDinoText).mockImplementation(async () => {
      callOrder.push('text:start');
      await new Promise((resolve) => setTimeout(resolve, 10));
      callOrder.push('text:end');
      return {
        scientificName: 'Volcanius ferox',
        commonName: 'Volcanrex',
        description: 'Un dinosaurio feroz que vive en volcanes.',
      };
    });
    vi.mocked(generateDinoImage).mockImplementation(async () => {
      callOrder.push('image:start');
      await new Promise((resolve) => setTimeout(resolve, 10));
      callOrder.push('image:end');
      return 'ZmFrZS1pbWFnZS1ieXRlcw==';
    });

    await onRequestPost({ request: createRequest(validBody), env } as any);

    expect(callOrder.indexOf('image:start')).toBeLessThan(callOrder.indexOf('text:end'));
  });

  it('serves from cache on the second identical request without calling upstream APIs again', async () => {
    const env = createEnv();
    await onRequestPost({ request: createRequest(validBody, '9.9.9.9'), env } as any);
    await onRequestPost({ request: createRequest(validBody, '9.9.9.8'), env } as any);
    const response = await onRequestPost({ request: createRequest(validBody, '9.9.9.7'), env } as any);
    expect(response.status).toBe(200);
    expect(generateDinoText).toHaveBeenCalledTimes(1);
    expect(generateDinoImage).toHaveBeenCalledTimes(1);
  });

  it('returns a resultId and stores a result record on cache miss', async () => {
    const env = createEnv();
    const response = await onRequestPost({ request: createRequest(validBody, '6.6.6.1'), env } as any);
    const json = (await response.json()) as any;
    expect(typeof json.resultId).toBe('string');
    expect(json.resultId.length).toBeGreaterThan(0);

    const stored = JSON.parse((await env.RESULTS_KV.get(`result:${json.resultId}`))!);
    expect(stored).toMatchObject({
      scientificName: 'Volcanius ferox',
      commonName: 'Volcanrex',
      discovererName: 'Lucía',
      email: null,
    });
  });

  it('returns a fresh resultId for each request even when served from cache', async () => {
    const env = createEnv();
    const first = (await (
      await onRequestPost({ request: createRequest(validBody, '6.6.6.2'), env } as any)
    ).json()) as any;
    const second = (await (
      await onRequestPost({ request: createRequest(validBody, '6.6.6.3'), env } as any)
    ).json()) as any;
    expect(first.resultId).not.toBe(second.resultId);
  });

  it('returns 502 with a generic message when an upstream API fails', async () => {
    const env = createEnv();
    vi.mocked(generateDinoText).mockRejectedValueOnce(new Error('Anthropic API error: 500'));
    const response = await onRequestPost({ request: createRequest(validBody, '5.5.5.5'), env } as any);
    expect(response.status).toBe(502);
    const json = (await response.json()) as any;
    expect(json.error).toBe('API_ERROR');
    expect(json.message).not.toMatch(/Anthropic/);
  });
});
