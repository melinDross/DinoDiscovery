import type { DinoAttributes } from '../../shared/types';

export async function computeCacheKey(attrs: DinoAttributes): Promise<string> {
  const canonical = [
    attrs.size,
    attrs.habitat,
    attrs.diet,
    attrs.feature,
    attrs.personality,
    'v2',
  ].join('|');
  const data = new TextEncoder().encode(canonical);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
