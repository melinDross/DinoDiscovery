import type { DinoAttributes, GenerateDinoRequest } from '../../shared/types';
import { computeCacheKey } from '../lib/hash';
import { checkAndIncrementRateLimit, type KVLike } from '../lib/rateLimit';
import { getCachedDino, setCachedDino } from '../lib/cache';
import { generateDinoText } from '../lib/anthropic';
import { generateDinoImage } from '../lib/openai';
import { storeImageInR2, type R2BucketLike } from '../lib/r2';

interface Env {
  RATE_LIMIT_KV: KVLike;
  CACHE_KV: KVLike;
  DINO_IMAGES: R2BucketLike;
  ANTHROPIC_API_KEY: string;
  OPENAI_API_KEY: string;
}

const VALID_SIZES = ['Pequeño', 'Mediano', 'Gigante'];
const VALID_HABITATS = ['Selva', 'Desierto', 'Océano', 'Montaña', 'Volcán'];
const VALID_DIETS = ['Carnívoro', 'Herbívoro', 'Omnívoro'];
const VALID_FEATURES = ['Cuernos', 'Alas', 'Escamas coloridas', 'Cola poderosa', 'Armadura', 'Súper garras'];
const VALID_PERSONALITIES = ['Feroz', 'Amigable', 'Veloz', 'Sigiloso'];

function isValidRequest(body: unknown): body is GenerateDinoRequest {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    VALID_SIZES.includes(b.size as string) &&
    VALID_HABITATS.includes(b.habitat as string) &&
    VALID_DIETS.includes(b.diet as string) &&
    VALID_FEATURES.includes(b.feature as string) &&
    VALID_PERSONALITIES.includes(b.personality as string) &&
    typeof b.discovererName === 'string' &&
    b.discovererName.trim().length > 0
  );
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';

  const rateLimitResult = await checkAndIncrementRateLimit(env.RATE_LIMIT_KV, ip);
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
    return Response.json({ error: 'API_ERROR', message: 'Atributos inválidos' }, { status: 400 });
  }

  const attrs: DinoAttributes = {
    size: body.size,
    habitat: body.habitat,
    diet: body.diet,
    feature: body.feature,
    personality: body.personality,
  };

  const cacheKey = await computeCacheKey(attrs);
  const cached = await getCachedDino(env.CACHE_KV, cacheKey);
  if (cached) {
    return Response.json({
      scientificName: cached.scientificName,
      commonName: cached.commonName,
      description: cached.description,
      imageUrl: `/images/${cached.imageKey}.png`,
    });
  }

  // KV reads are eventually consistent, so two concurrent requests for the
  // same uncached combo can both miss here and both call the upstream APIs.
  // Accepted for the MVP's traffic scale (bounded by the 5/hour rate limit);
  // the last cache write simply wins.
  try {
    const text = await generateDinoText(attrs, env.ANTHROPIC_API_KEY);
    const base64Image = await generateDinoImage(attrs, env.OPENAI_API_KEY);
    const imageKey = `${cacheKey}.png`;
    await storeImageInR2(env.DINO_IMAGES, imageKey, base64Image);

    await setCachedDino(env.CACHE_KV, cacheKey, {
      scientificName: text.scientificName,
      commonName: text.commonName,
      description: text.description,
      imageKey: cacheKey,
    });

    return Response.json({
      scientificName: text.scientificName,
      commonName: text.commonName,
      description: text.description,
      imageUrl: `/images/${imageKey}`,
    });
  } catch (err) {
    console.error('generate-dino failed:', err instanceof Error ? err.stack : err);
    return Response.json(
      { error: 'API_ERROR', message: 'No se pudo generar el dinosaurio' },
      { status: 502 }
    );
  }
}
