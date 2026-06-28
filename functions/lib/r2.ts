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
  base64Image: string
): Promise<void> {
  const binary = atob(base64Image);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  await bucket.put(key, bytes.buffer, { httpMetadata: { contentType: 'image/png' } });
}
