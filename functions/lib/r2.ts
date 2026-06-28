export interface R2BucketLike {
  put(
    key: string,
    value: ArrayBuffer | ReadableStream,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<unknown>;
}

export async function storeImageInR2(
  bucket: R2BucketLike,
  key: string,
  imageUrl: string,
  fetchFn: typeof fetch = fetch
): Promise<void> {
  const response = await fetchFn(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  await bucket.put(key, buffer, { httpMetadata: { contentType: 'image/png' } });
}
