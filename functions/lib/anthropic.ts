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

Reglas para la descripción:
- Exactamente 3 frases cortas, en español, divertidas y aptas para niños de 5 a 10 años.
- La primera frase describe su ASPECTO VISUAL: cómo luce el dinosaurio (color, tamaño, su característica especial visible).
- La segunda frase describe dónde vive y qué come.
- La tercera frase describe su personalidad o algo especial que hace.
La descripción debe coincidir con cómo se vería el dinosaurio en una ilustración: ${attrs.size}, con ${attrs.feature} visibles, en un entorno de ${attrs.habitat}.`;

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

  const jsonText = textBlock.text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');

  return JSON.parse(jsonText) as DinoText;
}
