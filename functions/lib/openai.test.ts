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
  it('returns the base64 image data from the OpenAI response', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ b64_json: 'ZmFrZS1pbWFnZS1ieXRlcw==' }] }),
    });

    const base64Image = await generateDinoImage(attrs, 'fake-key', fakeFetch as unknown as typeof fetch);

    expect(base64Image).toBe('ZmFrZS1pbWFnZS1ieXRlcw==');
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

  it('throws when the response has no image data', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) });

    await expect(
      generateDinoImage(attrs, 'fake-key', fakeFetch as unknown as typeof fetch)
    ).rejects.toThrow('No image data in OpenAI response');
  });

  it('requests a solid app-colored background instead of white', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ b64_json: 'ZmFrZS1pbWFnZS1ieXRlcw==' }] }),
    });

    await generateDinoImage(attrs, 'fake-key', fakeFetch as unknown as typeof fetch);

    const [, requestInit] = fakeFetch.mock.calls[0];
    const body = JSON.parse(requestInit.body as string);
    expect(body.prompt).toContain('solid background color #0d1a0f');
    expect(body.prompt).not.toContain('white background');
  });
});
