import { checkAndIncrementRateLimit, type KVLike } from '../lib/rateLimit';
import { getResult, setResultEmail } from '../lib/results';
import { subscribeToKitForm } from '../lib/kit';
import { isValidEmail } from '../../shared/validateEmail';

interface Env {
  RATE_LIMIT_KV: KVLike;
  RESULTS_KV: KVLike;
  KIT_API_KEY: string;
  KIT_FORM_ID: string;
}

interface SubscribeRequest {
  resultId: string;
  email: string;
}

function isValidRequest(body: unknown): body is SubscribeRequest {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return typeof b.resultId === 'string' && typeof b.email === 'string';
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';

  const rateLimitResult = await checkAndIncrementRateLimit(env.RATE_LIMIT_KV, `subscribe:${ip}`);
  if (!rateLimitResult.allowed) {
    return Response.json(
      { error: 'RATE_LIMITED', retryAfterSeconds: rateLimitResult.retryAfterSeconds },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'API_ERROR', message: 'Cuerpo de la petición inválido' }, { status: 400 });
  }

  if (!isValidRequest(body)) {
    return Response.json({ error: 'API_ERROR', message: 'Petición inválida' }, { status: 400 });
  }

  const record = await getResult(env.RESULTS_KV, body.resultId);
  if (!record) {
    return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  if (!isValidEmail(body.email)) {
    return Response.json({ error: 'API_ERROR', message: 'Email inválido' }, { status: 400 });
  }

  try {
    await subscribeToKitForm(body.email, body.resultId, {
      apiKey: env.KIT_API_KEY,
      formId: env.KIT_FORM_ID,
    });
  } catch (err) {
    console.error('subscribe failed:', err instanceof Error ? err.stack : err);
    return Response.json(
      { error: 'API_ERROR', message: 'No se pudo enviar el email de confirmación' },
      { status: 502 }
    );
  }

  await setResultEmail(env.RESULTS_KV, body.resultId, body.email);

  return Response.json({ ok: true });
}
