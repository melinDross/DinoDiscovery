interface ImagesEnv {
  DINO_IMAGES: R2Bucket;
}

export const onRequestGet: PagesFunction<ImagesEnv> = async (context) => {
  const key = context.params.key as string;
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
