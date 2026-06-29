import type { KVLike } from '../lib/rateLimit';
import { markEmailConfirmed } from '../lib/results';

interface Env {
  RESULTS_KV: KVLike;
  KIT_WEBHOOK_SECRET: string;
}

export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  if (secret !== env.KIT_WEBHOOK_SECRET) {
    return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const resultId = url.searchParams.get('resultId');
  if (!resultId) {
    return Response.json({ error: 'API_ERROR', message: 'Falta resultId' }, { status: 400 });
  }

  await markEmailConfirmed(env.RESULTS_KV, resultId);

  return new Response(null, { status: 302, headers: { Location: `/r/${resultId}` } });
}
