// The per-result dino image is generated with a fixed solid background color
// (see functions/lib/openai.ts's prompt: "solid background color #0d1a0f") so
// it can be composited over a habitat illustration. This strips that known
// background color to transparent client-side, post-generation — it does not
// touch the AI generation logic itself.
const BACKGROUND_COLOR = { r: 13, g: 26, b: 15 };
const FULLY_TRANSPARENT_THRESHOLD = 40;
const FEATHER_THRESHOLD = 80;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

export async function cutoutDinoImage(imageUrl: string): Promise<string> {
  const img = await loadImage(imageUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return imageUrl;
  }

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - BACKGROUND_COLOR.r;
    const dg = data[i + 1] - BACKGROUND_COLOR.g;
    const db = data[i + 2] - BACKGROUND_COLOR.b;
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);

    if (distance < FULLY_TRANSPARENT_THRESHOLD) {
      data[i + 3] = 0;
    } else if (distance < FEATHER_THRESHOLD) {
      const featherRatio = (distance - FULLY_TRANSPARENT_THRESHOLD) / (FEATHER_THRESHOLD - FULLY_TRANSPARENT_THRESHOLD);
      data[i + 3] = Math.round(data[i + 3] * featherRatio);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}
