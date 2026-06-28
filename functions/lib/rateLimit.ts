export interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

const LIMIT = 5;
const WINDOW_SECONDS = 3600;

export async function checkAndIncrementRateLimit(
  kv: KVLike,
  ip: string
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const key = `ratelimit:${ip}`;
  const raw = await kv.get(key);
  const count = raw ? parseInt(raw, 10) : 0;

  if (count >= LIMIT) {
    return { allowed: false, retryAfterSeconds: WINDOW_SECONDS };
  }

  await kv.put(key, String(count + 1), { expirationTtl: WINDOW_SECONDS });
  return { allowed: true, retryAfterSeconds: 0 };
}
