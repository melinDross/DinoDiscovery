import { describe, it, expect, vi } from 'vitest';
import { storeImageInR2, type R2BucketLike } from './r2';

describe('storeImageInR2', () => {
  it('downloads the image and puts it in the bucket with the given key', async () => {
    const fakeBytes = new ArrayBuffer(4);
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => fakeBytes,
    });
    const put = vi.fn().mockResolvedValue(undefined);
    const bucket: R2BucketLike = { put };

    await storeImageInR2(
      bucket,
      'abc123.png',
      'https://oaidalleapi.example/temp.png',
      fakeFetch as unknown as typeof fetch
    );

    expect(fakeFetch).toHaveBeenCalledWith('https://oaidalleapi.example/temp.png');
    expect(put).toHaveBeenCalledWith('abc123.png', fakeBytes, {
      httpMetadata: { contentType: 'image/png' },
    });
  });

  it('throws when the image download fails', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const bucket: R2BucketLike = { put: vi.fn() };

    await expect(
      storeImageInR2(bucket, 'abc123.png', 'https://example/missing.png', fakeFetch as unknown as typeof fetch)
    ).rejects.toThrow('Failed to download image: 404');
  });
});
