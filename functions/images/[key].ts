interface ImagesEnv {
  DINO_IMAGES: R2Bucket;
}

// Every image this app ever stores is keyed by computeCacheKey's output
// (functions/lib/hash.ts: a 64-char lowercase hex SHA-256 digest) plus the
// ".png" extension — nothing else is ever written to this bucket. Rejecting
// anything that doesn't match that exact shape before it reaches R2 is cheap
// and keeps this route from ever being used to probe/enumerate R2 with
// arbitrary keys.
const VALID_IMAGE_KEY = /^[a-f0-9]{64}\.png$/;

export const onRequestGet: PagesFunction<ImagesEnv> = async (context) => {
  const key = context.params.key as string;
  if (!VALID_IMAGE_KEY.test(key)) {
    return new Response('Not found', { status: 404 });
  }

  const object = await context.env.DINO_IMAGES.get(key);
  if (!object) {
    return new Response('Not found', { status: 404 });
  }
  return new Response(object.body, {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
};
