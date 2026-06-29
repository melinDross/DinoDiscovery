import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../lib/kit', () => ({
  isEmailConfirmed: vi.fn(),
}));

import { onRequestGet } from './[id]';
import { saveResult, getResult } from '../../lib/results';
import { isEmailConfirmed } from '../../lib/kit';

function createFakeKV() {
  const store = new Map<string, string>();
  return {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
  };
}

function createRecord(overrides: Partial<ReturnType<typeof baseRecord>> = {}) {
  return { ...baseRecord(), ...overrides };
}

function baseRecord() {
  return {
    scientificName: 'Volcanius ferox',
    commonName: 'Volcanrex',
    description: 'Un dinosaurio feroz que vive en volcanes.',
    imageKey: 'abc123',
    discovererName: 'Lucía',
    attrs: {
      size: 'Gigante' as const,
      habitat: 'Volcán' as const,
      diet: 'Carnívoro' as const,
      feature: 'Cuernos' as const,
      personality: 'Feroz' as const,
    },
    createdAt: 1000,
    email: null as string | null,
    emailConfirmed: false,
  };
}

function createEnv() {
  return { RESULTS_KV: createFakeKV(), KIT_API_KEY: 'fake-kit-key', KIT_FORM_ID: 'form-42' };
}

describe('onRequestGet /api/results/:id', () => {
  beforeEach(() => {
    vi.mocked(isEmailConfirmed).mockReset();
  });

  it('returns 404 when the resultId does not exist', async () => {
    const env = createEnv();
    const response = await onRequestGet({ params: { id: 'missing' }, env } as any);
    expect(response.status).toBe(404);
  });

  it('returns the public result fields without exposing the email', async () => {
    const env = createEnv();
    await saveResult(env.RESULTS_KV, 'result-1', createRecord());

    const response = await onRequestGet({ params: { id: 'result-1' }, env } as any);
    expect(response.status).toBe(200);
    const json = (await response.json()) as any;
    expect(json).toEqual({
      scientificName: 'Volcanius ferox',
      commonName: 'Volcanrex',
      description: 'Un dinosaurio feroz que vive en volcanes.',
      imageUrl: '/images/abc123.png',
      discovererName: 'Lucía',
      emailConfirmed: false,
    });
    expect(json.email).toBeUndefined();
  });

  it('does not call Kit when no email has been submitted yet', async () => {
    const env = createEnv();
    await saveResult(env.RESULTS_KV, 'result-1', createRecord());

    await onRequestGet({ params: { id: 'result-1' }, env } as any);

    expect(isEmailConfirmed).not.toHaveBeenCalled();
  });

  it('does not call Kit when the result was already confirmed', async () => {
    const env = createEnv();
    await saveResult(
      env.RESULTS_KV,
      'result-1',
      createRecord({ email: 'nina@example.com', emailConfirmed: true })
    );

    await onRequestGet({ params: { id: 'result-1' }, env } as any);

    expect(isEmailConfirmed).not.toHaveBeenCalled();
  });

  it('checks Kit and persists the confirmation when it has just become confirmed', async () => {
    const env = createEnv();
    await saveResult(
      env.RESULTS_KV,
      'result-1',
      createRecord({ email: 'nina@example.com', emailConfirmed: false })
    );
    vi.mocked(isEmailConfirmed).mockResolvedValue(true);

    const response = await onRequestGet({ params: { id: 'result-1' }, env } as any);

    expect(isEmailConfirmed).toHaveBeenCalledWith(
      'nina@example.com',
      { apiKey: 'fake-kit-key', formId: 'form-42' }
    );
    const json = (await response.json()) as any;
    expect(json.emailConfirmed).toBe(true);
    expect((await getResult(env.RESULTS_KV, 'result-1'))?.emailConfirmed).toBe(true);
  });

  it('reports unconfirmed without erroring when Kit still has it pending', async () => {
    const env = createEnv();
    await saveResult(
      env.RESULTS_KV,
      'result-1',
      createRecord({ email: 'nina@example.com', emailConfirmed: false })
    );
    vi.mocked(isEmailConfirmed).mockResolvedValue(false);

    const response = await onRequestGet({ params: { id: 'result-1' }, env } as any);

    const json = (await response.json()) as any;
    expect(json.emailConfirmed).toBe(false);
  });
});
