import { describe, it, expect, vi } from 'vitest';
import { generateDinoImage } from './openai';
import type { DinoAttributes } from '../../shared/types';

const attrs: DinoAttributes = {
  size: 'Gigante',
  habitat: 'Volcán',
  diet: 'Carnívoro',
  feature: 'Cuernos',
  personality: 'Feroz',
};

describe('generateDinoImage', () => {
  it('returns the image URL from the OpenAI response', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ url: 'https://oaidalleapi.example/temp-image.png' }] }),
    });

    const url = await generateDinoImage(attrs, 'fake-key', fakeFetch as unknown as typeof fetch);

    expect(url).toBe('https://oaidalleapi.example/temp-image.png');
    expect(fakeFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/images/generations',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('throws when the OpenAI API returns a non-OK status', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(
      generateDinoImage(attrs, 'fake-key', fakeFetch as unknown as typeof fetch)
    ).rejects.toThrow('OpenAI API error: 500');
  });

  it('throws when the response has no image URL', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) });

    await expect(
      generateDinoImage(attrs, 'fake-key', fakeFetch as unknown as typeof fetch)
    ).rejects.toThrow('No image URL in OpenAI response');
  });
});
