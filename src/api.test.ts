import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateDino, subscribeEmail, fetchResult, RateLimitError, DinoApiError } from './api';
import type { GenerateDinoRequest } from '../shared/types';

const req: GenerateDinoRequest = {
  size: 'Gigante',
  habitat: 'Volcán',
  diet: 'Carnívoro',
  feature: 'Cuernos',
  personality: 'Feroz',
  discovererName: 'Lucía',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('generateDino', () => {
  it('returns the parsed response on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          scientificName: 'Volcanius ferox',
          commonName: 'Volcanrex',
          description: 'desc',
          imageUrl: '/images/abc.png',
        }),
      })
    );

    const result = await generateDino(req);
    expect(result.commonName).toBe('Volcanrex');
  });

  it('throws RateLimitError on a 429 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'RATE_LIMITED', retryAfterSeconds: 1200 }),
      })
    );

    await expect(generateDino(req)).rejects.toBeInstanceOf(RateLimitError);
  });

  it('throws DinoApiError on a 502 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'API_ERROR', message: 'No se pudo generar el dinosaurio' }),
      })
    );

    await expect(generateDino(req)).rejects.toBeInstanceOf(DinoApiError);
  });
});

describe('subscribeEmail', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts the resultId and email to /api/subscribe', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);

    await subscribeEmail('result-1', 'nina@example.com');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/subscribe',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ resultId: 'result-1', email: 'nina@example.com' }),
      })
    );
  });

  it('throws DinoApiError when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'API_ERROR', message: 'No se pudo enviar el email de confirmación' }),
      })
    );

    await expect(subscribeEmail('result-1', 'nina@example.com')).rejects.toBeInstanceOf(DinoApiError);
  });
});

describe('fetchResult', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the parsed result on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          scientificName: 'Volcanius ferox',
          commonName: 'Volcanrex',
          description: 'desc',
          imageUrl: '/images/abc.png',
          discovererName: 'Lucía',
        }),
      })
    );

    const result = await fetchResult('result-1');
    expect(result?.commonName).toBe('Volcanrex');
  });

  it('returns null on a 404 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    expect(await fetchResult('missing')).toBeNull();
  });
});
