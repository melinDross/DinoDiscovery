import { describe, it, expect, vi } from 'vitest';
import { generateDinoText } from './anthropic';
import type { DinoAttributes } from '../../shared/types';

const attrs: DinoAttributes = {
  size: 'Gigante',
  habitat: 'Volcán',
  diet: 'Carnívoro',
  feature: 'Cuernos',
  personality: 'Feroz',
};

describe('generateDinoText', () => {
  it('parses scientificName, commonName and description from the Anthropic response', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              scientificName: 'Volcanius ferox',
              commonName: 'Volcanrex',
              description: 'Un dinosaurio feroz que vive en volcanes.',
            }),
          },
        ],
      }),
    });

    const result = await generateDinoText(attrs, 'fake-key', fakeFetch as unknown as typeof fetch);

    expect(result).toEqual({
      scientificName: 'Volcanius ferox',
      commonName: 'Volcanrex',
      description: 'Un dinosaurio feroz que vive en volcanes.',
    });
    expect(fakeFetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('throws when the Anthropic API returns a non-OK status', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(
      generateDinoText(attrs, 'fake-key', fakeFetch as unknown as typeof fetch)
    ).rejects.toThrow('Anthropic API error: 500');
  });
});
