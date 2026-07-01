export interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

const LIMIT = 3;
const WINDOW_SECONDS = 3600;

interface RateLimitRecord {
  count: number;
  windowStart: number;
}

export async function checkAndIncrementRateLimit(
  kv: KVLike,
  ip: string
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const key = `ratelimit:${ip}`;
  const raw = await kv.get(key);
  const now = Date.now();

  let record: RateLimitRecord;
  const parsed = raw ? (JSON.parse(raw) as RateLimitRecord) : null;
  const windowElapsedSeconds = parsed ? (now - parsed.windowStart) / 1000 : Infinity;

  if (parsed && windowElapsedSeconds < WINDOW_SECONDS) {
    record = parsed;
  } else {
    record = { count: 0, windowStart: now };
  }

  if (record.count >= LIMIT) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil(WINDOW_SECONDS - (now - record.windowStart) / 1000)
    );
    return { allowed: false, retryAfterSeconds };
  }

  record.count += 1;
  const remainingTtl = Math.max(1, Math.ceil(WINDOW_SECONDS - (now - record.windowStart) / 1000));
  await kv.put(key, JSON.stringify(record), { expirationTtl: remainingTtl });
  return { allowed: true, retryAfterSeconds: 0 };
}
