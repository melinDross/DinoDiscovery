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
    DINO_IMAGES: { put: vi.fn() },
    ANTHROPIC_API_KEY: 'fake-anthropic-key',
    OPENAI_API_KEY: 'fake-openai-key',
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

function createRequest(body: unknown, ip = '1.2.3.4') {
  return new Request('https://example.com/api/generate-dino', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'CF-Connecting-IP': ip },
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

  it('serves from cache on the second identical request without calling upstream APIs again', async () => {
    const env = createEnv();
    await onRequestPost({ request: createRequest(validBody, '9.9.9.9'), env } as any);
    await onRequestPost({ request: createRequest(validBody, '9.9.9.8'), env } as any);
    const response = await onRequestPost({ request: createRequest(validBody, '9.9.9.7'), env } as any);
    expect(response.status).toBe(200);
    expect(generateDinoText).toHaveBeenCalledTimes(1);
    expect(generateDinoImage).toHaveBeenCalledTimes(1);
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
