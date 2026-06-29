import type { KVLike } from '../../lib/rateLimit';
import { getResult } from '../../lib/results';

interface Env {
  RESULTS_KV: KVLike;
}

export async function onRequestGet(context: {
  params: { id: string };
  env: Env;
}): Promise<Response> {
  const record = await getResult(context.env.RESULTS_KV, context.params.id);
  if (!record) {
    return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  return Response.json({
    scientificName: record.scientificName,
    commonName: record.commonName,
    description: record.description,
    imageUrl: `/images/${record.imageKey}.png`,
    discovererName: record.discovererName,
    emailConfirmed: record.emailConfirmed,
  });
}
