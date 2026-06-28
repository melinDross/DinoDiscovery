import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateDino, RateLimitError, DinoApiError } from './api';
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
