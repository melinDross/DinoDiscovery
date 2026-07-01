#!/usr/bin/env node
// One-off post-process. Not part of the app's runtime or build — run
// manually with `node scripts/remove-medallion-backgrounds.mjs` after
// (re)generating medallions with scripts/generate-medallion-icons.mjs.
//
// gpt-image-2 doesn't reliably return real alpha transparency (same
// limitation documented for the dino cutout photos in
// src/utils/dinoCutout.ts) even when the prompt asks for a transparent
// background — these medallions come back as opaque PNGs with a light
// grey/white background behind the circular art, and on at least one icon
// (mediano.png) that "background" is itself a faint two-tone checkerboard
// texture (the model's own visual placeholder for "transparent"), not a
// flat color — its border pixels ranged ~211-253 per channel, a ~40-45
// spread. Flood-fills from the image border inward, clearing any pixel
// connected to the border that's close in color to the border's own
// *average* color, and stops at real color edges (e.g. the medallion's gold
// ring, distance ~225 from a typical light-grey background) so it doesn't
// eat into legitimate near-white highlights inside the artwork itself. The
// threshold comfortably exceeds that checkerboard's spread (verified this
// removes it cleanly, composited over a solid background, with no erosion
// of the artwork) while staying far below the gold-ring distance.
import { readdir } from 'node:fs/promises';
import sharp from 'sharp';

const dir = 'public/icons/medallions';
const COLOR_DISTANCE_THRESHOLD = 45; // per-channel-ish Euclidean tolerance

function colorDistance(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

async function removeBackground(path) {
  const image = sharp(path);
  const { data, info } = await image.raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // Sample border pixels to compute a reference background color.
  let sumR = 0,
    sumG = 0,
    sumB = 0,
    sampleCount = 0;
  for (let x = 0; x < width; x += 8) {
    for (const y of [0, height - 1]) {
      const i = (y * width + x) * channels;
      sumR += data[i];
      sumG += data[i + 1];
      sumB += data[i + 2];
      sampleCount++;
    }
  }
  const bgR = sumR / sampleCount;
  const bgG = sumG / sampleCount;
  const bgB = sumB / sampleCount;

  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  function tryEnqueue(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = y * width + x;
    if (visited[idx]) return;
    const i = idx * channels;
    const dist = colorDistance(data[i], data[i + 1], data[i + 2], bgR, bgG, bgB);
    if (dist > COLOR_DISTANCE_THRESHOLD) return;
    visited[idx] = 1;
    queue[tail++] = idx;
  }

  for (let x = 0; x < width; x++) {
    tryEnqueue(x, 0);
    tryEnqueue(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    tryEnqueue(0, y);
    tryEnqueue(width - 1, y);
  }

  while (head < tail) {
    const idx = queue[head++];
    const x = idx % width;
    const y = (idx / width) | 0;
    tryEnqueue(x + 1, y);
    tryEnqueue(x - 1, y);
    tryEnqueue(x, y + 1);
    tryEnqueue(x, y - 1);
  }

  for (let idx = 0; idx < width * height; idx++) {
    if (visited[idx]) {
      data[idx * channels + 3] = 0;
    }
  }

  await sharp(data, { raw: { width, height, channels } }).png().toFile(path);
}

async function main() {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.png'));
  for (const file of files) {
    const path = `${dir}/${file}`;
    console.log(`Removing background: ${file}`);
    await removeBackground(path);
  }
  console.log(`\nDone. Processed ${files.length} icons in ${dir}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
