// One-off script: shrink+recompress the committed static image assets in place.
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
];

const SINGLE_FILES = [
  { file: 'card-back.png', maxWidth: 900, hasAlpha: false },
  { file: 'landing-logo.png', maxWidth: 640, hasAlpha: true },
];

async function optimizeFile(filePath, { maxWidth, maxDimension, hasAlpha }) {
  const beforeSize = (await sharp(filePath).toBuffer()).length;

  const image = sharp(filePath);
  const resized = maxDimension
    ? image.resize({
        width: maxDimension,
        height: maxDimension,
        fit: 'inside',
        withoutEnlargement: true,
      })
    : image.resize({ width: maxWidth, withoutEnlargement: true });

  const output = hasAlpha
    ? resized.png({ compressionLevel: 9, palette: true, quality: 85 })
    : resized.png({ compressionLevel: 9, palette: true, quality: 88 });

  const buffer = await output.toBuffer();
  await writeFile(filePath, buffer);
  return { beforeSize, afterSize: buffer.length };
}

async function main() {
  let totalBefore = 0;
  let totalAfter = 0;

  for (const target of TARGETS) {
    const dirPath = path.join(ROOT, target.dir);
    const files = (await readdir(dirPath)).filter((f) => f.endsWith('.png'));
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const { beforeSize, afterSize } = await optimizeFile(filePath, target);
      totalBefore += beforeSize;
      totalAfter += afterSize;
      console.log(
        `${target.dir}/${file}: ${(beforeSize / 1024).toFixed(0)}KB -> ${(afterSize / 1024).toFixed(0)}KB`
      );
    }
  }

  for (const { file, maxWidth, hasAlpha } of SINGLE_FILES) {
    const filePath = path.join(ROOT, file);
    const { beforeSize, afterSize } = await optimizeFile(filePath, { maxWidth, hasAlpha });
    totalBefore += beforeSize;
    totalAfter += afterSize;
    console.log(`${file}: ${(beforeSize / 1024).toFixed(0)}KB -> ${(afterSize / 1024).toFixed(0)}KB`);
  }

  console.log(
    `\nTotal: ${(totalBefore / 1024 / 1024).toFixed(1)}MB -> ${(totalAfter / 1024 / 1024).toFixed(1)}MB`
  );
}

main();
