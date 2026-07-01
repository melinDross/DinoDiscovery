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

// Colorful enamel/gemstone medallions, not a uniform dark-stone bas-relief
// (the original look) — each attribute *category* gets its own accent
// palette so the five medallion rows on a card read as visually distinct
// groups instead of a monotone set, echoing the app's new pink/vibrant
// branding without making every icon identically pink.
const STYLE_PREFIX =
  'A vibrant glossy enamel medallion icon for a colorful collectible card ' +
  'game, bold flat-color illustration of ';
const STYLE_SUFFIX =
  ', rich saturated colors, glossy enamel/cloisonné finish with a subtle ' +
  'metallic gold border ring, dramatic rim light in ACCENT_COLOR, centered ' +
  'composition, single icon, no text, no watermark, transparent background';

const ICONS = [
  // size — warm amber/orange
  { slug: 'diminuto', subject: 'a tiny shrew-like creature', accent: 'warm amber-orange' },
  { slug: 'pequeno', subject: 'a small lizard', accent: 'warm amber-orange' },
  { slug: 'mediano', subject: 'a medium-sized reptile silhouette', accent: 'warm amber-orange' },
  { slug: 'grande', subject: 'a large beast head', accent: 'warm amber-orange' },
  { slug: 'gigante', subject: 'a giant dinosaur silhouette', accent: 'warm amber-orange' },
  { slug: 'coloso', subject: 'a colossal hulking beast silhouette', accent: 'warm amber-orange' },
  // diet — fresh green/teal
  { slug: 'carnivoro', subject: 'a sharp set of carnivore teeth', accent: 'fresh green-teal' },
  { slug: 'herbivoro', subject: 'a single leaf', accent: 'fresh green-teal' },
  { slug: 'omnivoro', subject: 'a leaf and a bone crossed', accent: 'fresh green-teal' },
  { slug: 'oofago', subject: 'a cracked egg', accent: 'fresh green-teal' },
  // feature — hot pink/magenta (matches the app's brand accent)
  { slug: 'cuernos', subject: 'a pair of curved horns', accent: 'hot pink-magenta' },
  { slug: 'alas', subject: 'a pair of dragon wings', accent: 'hot pink-magenta' },
  { slug: 'escamas-coloridas', subject: 'colorful iridescent scales', accent: 'hot pink-magenta' },
  { slug: 'cola-poderosa', subject: 'a powerful spiked tail', accent: 'hot pink-magenta' },
  { slug: 'armadura', subject: 'an armored shield plate', accent: 'hot pink-magenta' },
  { slug: 'super-garras', subject: 'sharp claws', accent: 'hot pink-magenta' },
  // personality — royal purple/violet
  { slug: 'feroz', subject: 'a roaring fanged mouth', accent: 'royal purple-violet' },
  { slug: 'amigable', subject: 'a friendly heart', accent: 'royal purple-violet' },
  { slug: 'veloz', subject: 'a lightning bolt motion trail', accent: 'royal purple-violet' },
  { slug: 'sigiloso', subject: 'a stealthy hooded shadow figure', accent: 'royal purple-violet' },
  // habitat — sky blue/cyan
  { slug: 'selva', subject: 'jungle leaves and vines', accent: 'sky blue-cyan' },
  { slug: 'desierto', subject: 'a desert dune with a sun', accent: 'sky blue-cyan' },
  { slug: 'oceano', subject: 'ocean waves', accent: 'sky blue-cyan' },
  { slug: 'montana', subject: 'a snow-capped mountain peak', accent: 'sky blue-cyan' },
  { slug: 'volcan', subject: 'an erupting volcano', accent: 'sky blue-cyan' },
  { slug: 'artico', subject: 'a sharp ice crystal', accent: 'sky blue-cyan' },
  // brand emblem (title bar logo) — full rainbow, it's the odd one out on purpose
  {
    slug: 'emblem',
    subject:
      'an ouroboros-like circular discovery symbol with a compass star at its center, ' +
      'a brand emblem',
    accent: 'rainbow multicolor',
  },
];

async function generateIcon(subject, accent) {
  const prompt = `${STYLE_PREFIX}${subject}${STYLE_SUFFIX}`.replace('ACCENT_COLOR', accent);
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

  for (const { slug, subject, accent } of ICONS) {
    const outPath = `${outDir}/${slug}.png`;
    console.log(`Generating ${slug}.png ...`);
    const buffer = await generateIcon(subject, accent);
    await writeFile(outPath, buffer);
    console.log(`  saved ${outPath} (${buffer.length} bytes)`);
  }

  console.log(`\nDone. Generated ${ICONS.length} icons in ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
