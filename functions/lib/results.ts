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
  emailConfirmed: boolean;
}

const RESULT_TTL_SECONDS = 90 * 24 * 60 * 60;

function resultKey(resultId: string): string {
  return `result:${resultId}`;
}

function pendingEmailKey(email: string): string {
  return `pending-email:${email}`;
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

  const raw = await kv.get(pendingEmailKey(email));
  const pending = raw ? (JSON.parse(raw) as string[]) : [];
  if (!pending.includes(resultId)) {
    pending.push(resultId);
  }
  await kv.put(pendingEmailKey(email), JSON.stringify(pending), {
    expirationTtl: RESULT_TTL_SECONDS,
  });
}

export async function markEmailConfirmed(kv: KVLike, resultId: string): Promise<void> {
  const record = await getResult(kv, resultId);
  if (!record) return;
  record.emailConfirmed = true;
  await saveResult(kv, resultId, record);
}

export async function confirmResultsForEmail(kv: KVLike, email: string): Promise<string[]> {
  const raw = await kv.get(pendingEmailKey(email));
  const resultIds = raw ? (JSON.parse(raw) as string[]) : [];
  for (const resultId of resultIds) {
    await markEmailConfirmed(kv, resultId);
  }
  return resultIds;
}
