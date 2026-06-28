import type { DinoAttributes } from '../../shared/types';

export interface DinoText {
  scientificName: string;
  commonName: string;
  description: string;
}

export async function generateDinoText(
  attrs: DinoAttributes,
  apiKey: string,
  fetchFn: typeof fetch = fetch
): Promise<DinoText> {
  const prompt = `Crea un dinosaurio ficticio para niños con estos atributos:
Tamaño: ${attrs.size}
Hábitat: ${attrs.habitat}
Dieta: ${attrs.diet}
Característica especial: ${attrs.feature}
Personalidad: ${attrs.personality}

Responde SOLO con un objeto JSON con esta forma exacta, sin texto adicional:
{"scientificName": "...", "commonName": "...", "description": "..."}
La descripción debe tener 2-3 líneas, ser divertida y apta para niños de 5 a 10 años, en español.`;

  const response = await fetchFn('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = (await response.json()) as { content: { type: string; text: string }[] };
  const textBlock = data.content.find((block) => block.type === 'text');
  if (!textBlock) {
    throw new Error('No text content in Anthropic response');
  }

  return JSON.parse(textBlock.text) as DinoText;
}
