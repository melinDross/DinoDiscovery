import type {
  GenerateDinoRequest,
  GenerateDinoResponse,
  ApiErrorResponse,
  DinoAttributes,
} from '../shared/types';
import { getAdminKey } from './adminAuth';

export class RateLimitError extends Error {
  retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super('RATE_LIMITED');
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class DinoApiError extends Error {}

export async function generateDino(req: GenerateDinoRequest): Promise<GenerateDinoResponse> {
  const adminKey = getAdminKey();
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (adminKey) {
    headers['X-Admin-Key'] = adminKey;
  }

  const response = await fetch('/api/generate-dino', {
    method: 'POST',
    headers,
    body: JSON.stringify(req),
  });

  if (response.ok) {
    return (await response.json()) as GenerateDinoResponse;
  }

  const errorBody = (await response.json()) as ApiErrorResponse;
  if (errorBody.error === 'RATE_LIMITED') {
    throw new RateLimitError(errorBody.retryAfterSeconds ?? 3600);
  }
  throw new DinoApiError(errorBody.message ?? 'Error desconocido');
}

export async function subscribeEmail(resultId: string, email: string): Promise<void> {
  const response = await fetch('/api/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ resultId, email }),
  });

  if (response.ok) return;

  const errorBody = (await response.json()) as ApiErrorResponse;
  if (errorBody.error === 'RATE_LIMITED') {
    throw new RateLimitError(errorBody.retryAfterSeconds ?? 3600);
  }
  throw new DinoApiError(errorBody.message ?? 'Error desconocido');
}

export interface FetchedResult {
  scientificName: string;
  commonName: string;
  description: string;
  imageUrl: string;
  discovererName: string;
  attrs: DinoAttributes;
}

export async function fetchResult(resultId: string): Promise<FetchedResult | null> {
  const response = await fetch(`/api/results/${resultId}`);
  if (!response.ok) return null;
  return (await response.json()) as FetchedResult;
}
