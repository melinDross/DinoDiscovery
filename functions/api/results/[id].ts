import type { KVLike } from '../../lib/rateLimit';
import { getResult, markEmailConfirmed } from '../../lib/results';
import { isEmailConfirmed } from '../../lib/kit';

interface Env {
  RESULTS_KV: KVLike;
  KIT_API_KEY: string;
  KIT_FORM_ID: string;
}

export async function onRequestGet(context: {
  params: { id: string };
  env: Env;
}): Promise<Response> {
  const { params, env } = context;
  const record = await getResult(env.RESULTS_KV, params.id);
  if (!record) {
    return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  let emailConfirmed = record.emailConfirmed;
  if (!emailConfirmed && record.email) {
    emailConfirmed = await isEmailConfirmed(record.email, {
      apiKey: env.KIT_API_KEY,
      formId: env.KIT_FORM_ID,
    });
    if (emailConfirmed) {
      await markEmailConfirmed(env.RESULTS_KV, params.id);
    }
  }

  return Response.json({
    scientificName: record.scientificName,
    commonName: record.commonName,
    description: record.description,
    imageUrl: `/images/${record.imageKey}.png`,
    discovererName: record.discovererName,
    emailConfirmed,
  });
}
