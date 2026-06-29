#!/usr/bin/env node
// One-off asset generator. Not part of the app's runtime or build — run
// manually with `node scripts/generate-medallion-icons.mjs` whenever the
// medallion set needs to be (re)created. Reads OPENAI_API_KEY from the
// environment, same convention as scripts/generate-landing-logo.mjs.
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('Missing OPENAI_API_KEY environment variable');
  process.exit(1);
}

const outDir = 'public/icons/medallions';

const STYLE_PREFIX =
  'A circular stone medallion icon for a dark-fantasy collectible card game, ' +
  'bas-relief carving of ';
const STYLE_SUFFIX =
  ', engraved in dark grey stone, glowing purple rim light, dramatic ' +
  'side lighting, centered composition, single icon, no text, no watermark, ' +
  'transparent background';

const ICONS = [
  // size
  { slug: 'diminuto', subject: 'a tiny shrew-like creature' },
  { slug: 'pequeno', subject: 'a small lizard' },
  { slug: 'mediano', subject: 'a medium-sized reptile silhouette' },
  { slug: 'grande', subject: 'a large beast head' },
  { slug: 'gigante', subject: 'a giant dinosaur silhouette' },
  { slug: 'coloso', subject: 'a colossal hulking beast silhouette' },
  // diet
  { slug: 'carnivoro', subject: 'a sharp set of carnivore teeth' },
  { slug: 'herbivoro', subject: 'a single leaf' },
  { slug: 'omnivoro', subject: 'a leaf and a bone crossed' },
  { slug: 'oofago', subject: 'a cracked egg' },
  // feature
  { slug: 'cuernos', subject: 'a pair of curved horns' },
  { slug: 'alas', subject: 'a pair of dragon wings' },
  { slug: 'escamas-coloridas', subject: 'colorful iridescent scales' },
  { slug: 'cola-poderosa', subject: 'a powerful spiked tail' },
  { slug: 'armadura', subject: 'an armored shield plate' },
  { slug: 'super-garras', subject: 'sharp claws' },
  // personality
  { slug: 'feroz', subject: 'a roaring fanged mouth' },
  { slug: 'amigable', subject: 'a friendly heart' },
  { slug: 'veloz', subject: 'a lightning bolt motion trail' },
  { slug: 'sigiloso', subject: 'a stealthy hooded shadow figure' },
  // habitat
  { slug: 'selva', subject: 'jungle leaves and vines' },
  { slug: 'desierto', subject: 'a desert dune with a sun' },
  { slug: 'oceano', subject: 'ocean waves' },
  { slug: 'montana', subject: 'a snow-capped mountain peak' },
  { slug: 'volcan', subject: 'an erupting volcano' },
  { slug: 'artico', subject: 'a sharp ice crystal' },
  // brand emblem (title bar logo)
  {
    slug: 'emblem',
    subject:
      'an ouroboros-like circular discovery symbol with a compass star at its center, ' +
      'a brand emblem',
  },
];

async function generateIcon(subject) {
  const prompt = `${STYLE_PREFIX}${subject}${STYLE_SUFFIX}`;
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
    throw new Error(`OpenAI API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error('No image data in OpenAI response');
  }
  return Buffer.from(b64, 'base64');
}

async function main() {
  if (!existsSync(outDir)) {
    await mkdir(outDir, { recursive: true });
  }

  for (const { slug, subject } of ICONS) {
    const outPath = `${outDir}/${slug}.png`;
    console.log(`Generating ${slug}.png ...`);
    const buffer = await generateIcon(subject);
    await writeFile(outPath, buffer);
    console.log(`  saved ${outPath} (${buffer.length} bytes)`);
  }

  console.log(`\nDone. Generated ${ICONS.length} icons in ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
