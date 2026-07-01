import type { KVLike } from './rateLimit';

// Hard ceiling on real (non-cached) generations per UTC day, across all
// visitors combined — separate from the per-IP hourly rate limit. The
// per-IP limit bounds a single visitor's worst case; this bounds the
// project owner's worst-case daily API spend if the site gets a traffic
// spike from many different IPs at once (e.g. a link going semi-viral).
// Only cache-miss generations count against it — reusing a cached
// combo costs nothing, so it's never blocked by this.
const GLOBAL_DAILY_LIMIT = 30;

function utcDateKey(now: Date): string {
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
}

function secondsUntilNextUtcMidnight(now: Date): number {
  const tomorrow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(60, Math.ceil((tomorrow - now.getTime()) / 1000));
}

export async function checkAndIncrementGlobalBudget(kv: KVLike): Promise<{ allowed: boolean }> {
  const now = new Date();
  const key = `globalbudget:${utcDateKey(now)}`;
  const raw = await kv.get(key);
  const count = raw ? parseInt(raw, 10) : 0;

  if (count >= GLOBAL_DAILY_LIMIT) {
    return { allowed: false };
  }

  await kv.put(key, String(count + 1), { expirationTtl: secondsUntilNextUtcMidnight(now) });
  return { allowed: true };
}
