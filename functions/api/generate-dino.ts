import type { DinoAttributes, GenerateDinoRequest } from '../../shared/types';
import { computeCacheKey } from '../lib/hash';
import { checkAndIncrementRateLimit, type KVLike } from '../lib/rateLimit';
import { checkAndIncrementGlobalBudget } from '../lib/globalBudget';
import { getCachedDino, setCachedDino } from '../lib/cache';
import { generateDinoText } from '../lib/anthropic';
import { generateDinoImage } from '../lib/openai';
import { storeImageInR2, type R2BucketLike } from '../lib/r2';
import { isValidAdminKey } from '../lib/adminAuth';
import { saveResult } from '../lib/results';
import { readJsonBody } from '../lib/requestBody';

interface Env {
  RATE_LIMIT_KV: KVLike;
  CACHE_KV: KVLike;
  RESULTS_KV: KVLike;
  DINO_IMAGES: R2BucketLike;
  ANTHROPIC_API_KEY: string;
  OPENAI_API_KEY: string;
  ADMIN_KEY?: string;
}

const VALID_SIZES = ['Diminuto', 'Pequeño', 'Mediano', 'Grande', 'Gigante', 'Coloso'];
const VALID_HABITATS = ['Selva', 'Desierto', 'Océano', 'Montaña', 'Volcán', 'Ártico'];
const VALID_DIETS = ['Carnívoro', 'Herbívoro', 'Omnívoro', 'Oófago'];
const VALID_FEATURES = ['Cuernos', 'Alas', 'Escamas coloridas', 'Cola poderosa', 'Armadura', 'Súper garras'];
const VALID_PERSONALITIES = ['Feroz', 'Amigable', 'Veloz', 'Sigiloso'];
// The whole request is 5 short enum strings plus a capped discoverer name —
// nowhere near this generous, but it bounds a malicious oversized body.
const MAX_BODY_BYTES = 2000;
const MAX_DISCOVERER_NAME_LENGTH = 40;
const CONTROL_CHARS = /[\x00-\x1f\x7f]/g;

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

function sanitizeDiscovererName(name: string): string {
  return name.replace(CONTROL_CHARS, '').trim().slice(0, MAX_DISCOVERER_NAME_LENGTH);
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const isAdmin = isValidAdminKey(request.headers.get('X-Admin-Key'), env.ADMIN_KEY);

  if (!isAdmin) {
    const rateLimitResult = await checkAndIncrementRateLimit(env.RATE_LIMIT_KV, ip);
    if (!rateLimitResult.allowed) {
      return Response.json(
        { error: 'RATE_LIMITED', retryAfterSeconds: rateLimitResult.retryAfterSeconds },
        { status: 429 }
      );
    }
  }

  const bodyResult = await readJsonBody(request, MAX_BODY_BYTES);
  if (!bodyResult.ok) {
    return Response.json({ error: 'API_ERROR', message: bodyResult.message }, { status: bodyResult.status });
  }
  const body = bodyResult.body;

  if (!isValidRequest(body)) {
    return Response.json({ error: 'API_ERROR', message: 'Atributos inválidos' }, { status: 400 });
  }

  const discovererName = sanitizeDiscovererName(body.discovererName);
  if (discovererName.length === 0) {
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
    const resultId = crypto.randomUUID();
    await saveResult(env.RESULTS_KV, resultId, {
      scientificName: cached.scientificName,
      commonName: cached.commonName,
      description: cached.description,
      imageKey: cached.imageKey,
      discovererName,
      attrs,
      createdAt: Date.now(),
      email: null,
    });
    return Response.json({
      resultId,
      scientificName: cached.scientificName,
      commonName: cached.commonName,
      description: cached.description,
      imageUrl: `/images/${cached.imageKey}.png`,
    });
  }

  // Only cache-miss generations (the ones that actually call Anthropic +
  // OpenAI) count against the daily global budget — a cache hit above never
  // reaches here. This is a separate, higher ceiling than the per-IP rate
  // limit: that one bounds a single visitor's worst case, this one bounds
  // the project owner's total daily spend if many different IPs hit
  // uncached combos at once (e.g. a traffic spike from the project being
  // shared somewhere). Admins bypass this the same way they bypass the
  // per-IP limit.
  if (!isAdmin) {
    const budgetResult = await checkAndIncrementGlobalBudget(env.RATE_LIMIT_KV);
    if (!budgetResult.allowed) {
      return Response.json(
        {
          error: 'GLOBAL_BUDGET_EXCEEDED',
          message: 'Se alcanzó el límite diario de nuevos descubrimientos. ¡Vuelve mañana!',
        },
        { status: 429 }
      );
    }
  }

  // KV reads are eventually consistent, so two concurrent requests for the
  // same uncached combo can both miss here and both call the upstream APIs.
  // Accepted for the MVP's traffic scale (bounded by the 3/hour rate limit);
  // the last cache write simply wins.
  try {
    const [text, base64Image] = await Promise.all([
      generateDinoText(attrs, env.ANTHROPIC_API_KEY),
      generateDinoImage(attrs, env.OPENAI_API_KEY),
    ]);
    const imageKey = `${cacheKey}.png`;
    await storeImageInR2(env.DINO_IMAGES, imageKey, base64Image);

    await setCachedDino(env.CACHE_KV, cacheKey, {
      scientificName: text.scientificName,
      commonName: text.commonName,
      description: text.description,
      imageKey: cacheKey,
    });

    const resultId = crypto.randomUUID();
    await saveResult(env.RESULTS_KV, resultId, {
      scientificName: text.scientificName,
      commonName: text.commonName,
      description: text.description,
      imageKey: cacheKey,
      discovererName,
      attrs,
      createdAt: Date.now(),
      email: null,
    });

    return Response.json({
      resultId,
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
