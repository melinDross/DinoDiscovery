import type { KVLike } from './rateLimit';
import type { DinoAttributes } from '../../shared/types';

export interface ResultRecord {
  scientificName: string;
  commonName: string;
  description: string;
  imageKey: string;
  discovererName: string;
  attrs: DinoAttributes;
  createdAt: number;
  email: string | null;
}

const RESULT_TTL_SECONDS = 90 * 24 * 60 * 60;

function resultKey(resultId: string): string {
  return `result:${resultId}`;
}

export async function getResult(kv: KVLike, resultId: string): Promise<ResultRecord | null> {
  const raw = await kv.get(resultKey(resultId));
  return raw ? (JSON.parse(raw) as ResultRecord) : null;
}

export async function saveResult(
  kv: KVLike,
  resultId: string,
  record: ResultRecord
): Promise<void> {
  await kv.put(resultKey(resultId), JSON.stringify(record), {
    expirationTtl: RESULT_TTL_SECONDS,
  });
}

export async function setResultEmail(
  kv: KVLike,
  resultId: string,
  email: string
): Promise<void> {
  const record = await getResult(kv, resultId);
  if (!record) return;
  record.email = email;
  await saveResult(kv, resultId, record);
}
