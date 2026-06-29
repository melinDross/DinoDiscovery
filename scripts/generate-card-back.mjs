#!/usr/bin/env node
// One-off asset generator for the collectible card's back face. Not part of
// the app's runtime or build — run manually with
// `node scripts/generate-card-back.mjs`. Reads OPENAI_API_KEY from the
// environment, same convention as scripts/generate-landing-logo.mjs.
import { writeFile, mkdir } from 'node:fs/promises';

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('Missing OPENAI_API_KEY environment variable');
  process.exit(1);
}

const prompt =
  "A premium trading card back design for a children's collectible app " +
  "called 'Dino Discovery'. Centered bold rounded title text 'Dino " +
  'Discovery' +
  '" in bright pink/magenta with a thick black outline, playful storybook ' +
  'font. To the left of the title, a circular icon made of two curved ' +
  'arrows forming a loop (like a recycle/refresh symbol) in the same pink, ' +
  'with small sparkly four-pointed stars decorating it. Background is a ' +
  'dreamy magical night scene: deep teal-to-indigo-to-purple gradient sky, ' +
  'scattered glowing stars, soft sparkle particles drifting like fireflies, ' +
  'faint bokeh light, mystical atmosphere, vertical portrait composition ' +
  'filling the whole frame edge to edge, no other text, no watermark, no ' +
  'border, no characters or creatures, rich saturated colors.';

const response = await fetch('https://api.openai.com/v1/images/generations', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: 'gpt-image-2',
    prompt,
    n: 1,
    size: '1024x1536',
    quality: 'low',
  }),
});

if (!response.ok) {
  const text = await response.text();
  console.error(`OpenAI API error: ${response.status} ${text}`);
  process.exit(1);
}

const data = await response.json();
const base64Image = data.data?.[0]?.b64_json;
if (!base64Image) {
  console.error('No image data in OpenAI response');
  process.exit(1);
}

await mkdir('public', { recursive: true });
await writeFile('public/card-back.png', Buffer.from(base64Image, 'base64'));
console.log('Wrote public/card-back.png');
