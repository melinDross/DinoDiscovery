import { writeFile, mkdir } from 'node:fs/promises';

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('Missing OPENAI_API_KEY environment variable');
  process.exit(1);
}

const prompt =
  "A friendly cartoon dinosaur mascot logo for a children's app, smiling, " +
  'rounded soft shapes, saturated colors (green, purple, orange), simple flat ' +
  "illustration style like a children's storybook, centered, no text, no " +
  'watermark, white background.';

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
    size: '1024x1024',
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
await writeFile('public/landing-logo.png', Buffer.from(base64Image, 'base64'));
console.log('Wrote public/landing-logo.png');
