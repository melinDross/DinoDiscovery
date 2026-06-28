import type { DinoAttributes } from '../../shared/types';

export async function generateDinoImage(
  attrs: DinoAttributes,
  apiKey: string,
  fetchFn: typeof fetch = fetch
): Promise<string> {
  const prompt = `A friendly cartoon dinosaur for a children's app, ${attrs.size} size, living in ${attrs.habitat}, ${attrs.diet} diet, with ${attrs.feature}, ${attrs.personality} personality. Colorful, simple, no text, no watermark, white background.`;

  const response = await fetchFn('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = (await response.json()) as { data: { url: string }[] };
  if (!data.data?.[0]?.url) {
    throw new Error('No image URL in OpenAI response');
  }
  return data.data[0].url;
}
