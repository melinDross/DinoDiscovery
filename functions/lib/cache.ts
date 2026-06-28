import type { KVLike } from './rateLimit';

export interface CachedDino {
  scientificName: string;
  commonName: string;
  description: string;
  imageKey: string;
}

export async function getCachedDino(kv: KVLike, cacheKey: string): Promise<CachedDino | null> {
  const raw = await kv.get(`cache:${cacheKey}`);
  return raw ? (JSON.parse(raw) as CachedDino) : null;
}

export async function setCachedDino(
  kv: KVLike,
  cacheKey: string,
  value: CachedDino
): Promise<void> {
  await kv.put(`cache:${cacheKey}`, JSON.stringify(value));
}
