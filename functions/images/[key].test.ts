import { describe, it, expect, vi } from 'vitest';
import { onRequestGet } from './[key]';

const VALID_KEY = 'a'.repeat(64) + '.png';

function createContext(key: string, getImpl: (k: string) => Promise<unknown>) {
  return {
    params: { key },
    env: { DINO_IMAGES: { get: vi.fn(getImpl) } },
  } as any;
}

describe('onRequestGet /images/[key]', () => {
  it('serves the object when the key matches the expected 64-hex-char.png shape', async () => {
    const get = vi.fn().mockResolvedValue({ body: new ReadableStream() });
    const context = { params: { key: VALID_KEY }, env: { DINO_IMAGES: { get } } } as any;

    const response = await onRequestGet(context);

    expect(get).toHaveBeenCalledWith(VALID_KEY);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
  });

  it('returns 404 without calling R2 when the key has the wrong length', async () => {
    const context = createContext('abc.png', async () => ({ body: new ReadableStream() }));
    const response = await onRequestGet(context);
    expect(response.status).toBe(404);
    expect(context.env.DINO_IMAGES.get).not.toHaveBeenCalled();
  });

  it('returns 404 without calling R2 when the key has an unexpected extension', async () => {
    const context = createContext('a'.repeat(64) + '.jpg', async () => ({ body: new ReadableStream() }));
    const response = await onRequestGet(context);
    expect(response.status).toBe(404);
    expect(context.env.DINO_IMAGES.get).not.toHaveBeenCalled();
  });

  it('returns 404 without calling R2 when the key contains path traversal characters', async () => {
    const context = createContext('../../etc/passwd', async () => ({ body: new ReadableStream() }));
    const response = await onRequestGet(context);
    expect(response.status).toBe(404);
    expect(context.env.DINO_IMAGES.get).not.toHaveBeenCalled();
  });

  it('returns 404 when a validly-shaped key is not found in R2', async () => {
    const context = createContext(VALID_KEY, async () => null);
    const response = await onRequestGet(context);
    expect(response.status).toBe(404);
  });
});
