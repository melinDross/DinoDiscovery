import type { GenerateDinoRequest, GenerateDinoResponse, ApiErrorResponse } from '../shared/types';
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
