// One-off script: shrink+recompress the committed static image assets in place,
// and emit a .webp copy alongside each one (the app references the .webp files;
// the .png originals are kept as source/fallback, not served by any code path).
// Run manually: node scripts/optimize-images.mjs
// Not part of the build. Uses sharp (already a devDependency).
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..', 'public');

const TARGETS = [
  // Medallions render at up to 132px in the wizard / 72px on the card — 320px covers 2x retina with margin.
  { dir: 'icons/medallions', maxDimension: 320, hasAlpha: true },
  // Habitat art fills a 420px-wide card at up to ~440px tall — 900px wide covers 2x retina.
  { dir: 'habitats', maxWidth: 900, hasAlpha: false },
  // Loading-screen eggs render at a fixed 112px (w-28) — 320px covers 2x retina with margin.
  { dir: 'loading', maxDimension: 320, hasAlpha: true },
];

const SINGLE_FILES = [
  { file: 'card-back.png', maxWidth: 900, hasAlpha: false },
  { file: 'landing-logo.png', maxWidth: 640, hasAlpha: true },
  // Wordmark renders up to max-w-md (448px) — 900px covers 2x retina.
  { file: 'dino-discovery-logo.png', maxWidth: 900, hasAlpha: true },
];

async function optimizeFile(filePath, { maxWidth, maxDimension, hasAlpha }) {
  const beforeSize = (await sharp(filePath).toBuffer()).length;

  const resizeOptions = maxDimension
    ? { width: maxDimension, height: maxDimension, fit: 'inside', withoutEnlargement: true }
    : { width: maxWidth, withoutEnlargement: true };

  const resized = sharp(filePath).resize(resizeOptions);
  const pngBuffer = await resized
    .clone()
    .png({ compressionLevel: 9, palette: true, quality: hasAlpha ? 85 : 88 })
    .toBuffer();
  const webpBuffer = await resized
    .clone()
    .webp({ quality: hasAlpha ? 85 : 82, alphaQuality: 90 })
    .toBuffer();

  await writeFile(filePath, pngBuffer);
  await writeFile(filePath.replace(/\.png$/, '.webp'), webpBuffer);

  return { beforeSize, afterSize: pngBuffer.length, webpSize: webpBuffer.length };
}

async function main() {
  let totalBefore = 0;
  let totalAfterPng = 0;
  let totalAfterWebp = 0;

  const report = (label, beforeSize, afterSize, webpSize) => {
    totalBefore += beforeSize;
    totalAfterPng += afterSize;
    totalAfterWebp += webpSize;
    console.log(
      `${label}: ${(beforeSize / 1024).toFixed(0)}KB -> ${(afterSize / 1024).toFixed(0)}KB png / ${(webpSize / 1024).toFixed(0)}KB webp`
    );
  };

  for (const target of TARGETS) {
    const dirPath = path.join(ROOT, target.dir);
    const files = (await readdir(dirPath)).filter((f) => f.endsWith('.png'));
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const { beforeSize, afterSize, webpSize } = await optimizeFile(filePath, target);
      report(`${target.dir}/${file}`, beforeSize, afterSize, webpSize);
    }
  }

  for (const { file, maxWidth, hasAlpha } of SINGLE_FILES) {
    const filePath = path.join(ROOT, file);
    const { beforeSize, afterSize, webpSize } = await optimizeFile(filePath, { maxWidth, hasAlpha });
    report(file, beforeSize, afterSize, webpSize);
  }

  console.log(
    `\nTotal: ${(totalBefore / 1024 / 1024).toFixed(1)}MB -> ${(totalAfterPng / 1024 / 1024).toFixed(1)}MB png, ${(totalAfterWebp / 1024 / 1024).toFixed(1)}MB webp`
  );
}

main();
