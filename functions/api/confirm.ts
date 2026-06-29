import type { KVLike } from '../lib/rateLimit';
import { confirmResultsForEmail } from '../lib/results';

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

  const email = url.searchParams.get('email');
  if (!email) {
    return Response.json({ error: 'API_ERROR', message: 'Falta email' }, { status: 400 });
  }

  const confirmedResultIds = await confirmResultsForEmail(env.RESULTS_KV, email);
  const lastResultId = confirmedResultIds[confirmedResultIds.length - 1];

  return new Response(null, {
    status: 302,
    headers: { Location: lastResultId ? `/r/${lastResultId}` : '/' },
  });
}
