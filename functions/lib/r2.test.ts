import { describe, it, expect, vi } from 'vitest';
import { storeImageInR2, type R2BucketLike } from './r2';

describe('storeImageInR2', () => {
  it('decodes the base64 image and puts it in the bucket with the given key', async () => {
    const base64Image = btoa('fake-image-bytes');
    const put = vi.fn().mockResolvedValue(undefined);
    const bucket: R2BucketLike = { put };

    await storeImageInR2(bucket, 'abc123.png', base64Image);

    expect(put).toHaveBeenCalledTimes(1);
    const [key, value, options] = put.mock.calls[0];
    expect(key).toBe('abc123.png');
    expect(options).toEqual({ httpMetadata: { contentType: 'image/png' } });
    expect(new TextDecoder().decode(value as ArrayBuffer)).toBe('fake-image-bytes');
  });
});
