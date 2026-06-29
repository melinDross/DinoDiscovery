import { describe, it, expect, vi } from 'vitest';
import { subscribeToKitForm, isEmailConfirmed } from './kit';

function createFetchSequence(...responses: { ok: boolean; status?: number; json?: () => Promise<unknown> }[]) {
  const fakeFetch = vi.fn();
  for (const response of responses) {
    fakeFetch.mockResolvedValueOnce(response);
  }
  return fakeFetch;
}

describe('subscribeToKitForm', () => {
  it('creates the subscriber with the resultId custom field, then adds it to the form', async () => {
    const fakeFetch = createFetchSequence(
      { ok: true, json: async () => ({ subscriber: { id: 349 } }) },
      { ok: true, json: async () => ({}) }
    );

    await subscribeToKitForm(
      'nina@example.com',
      'result-1',
      { apiKey: 'fake-kit-key', formId: 'form-42' },
      fakeFetch as unknown as typeof fetch
    );

    expect(fakeFetch).toHaveBeenNthCalledWith(
      1,
      'https://api.kit.com/v4/subscribers',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-Kit-Api-Key': 'fake-kit-key' }),
      })
    );
    const createBody = JSON.parse((fakeFetch.mock.calls[0][1].body as string));
    expect(createBody).toEqual({
      email_address: 'nina@example.com',
      fields: { dino_result_id: 'result-1' },
    });

    expect(fakeFetch).toHaveBeenNthCalledWith(
      2,
      'https://api.kit.com/v4/forms/form-42/subscribers/349',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-Kit-Api-Key': 'fake-kit-key' }),
      })
    );
    const addToFormBody = JSON.parse((fakeFetch.mock.calls[1][1].body as string));
    expect(addToFormBody).toHaveProperty('referrer');
  });

  it('throws when creating the subscriber fails', async () => {
    const fakeFetch = createFetchSequence({ ok: false, status: 422 });

    await expect(
      subscribeToKitForm(
        'nina@example.com',
        'result-1',
        { apiKey: 'fake-kit-key', formId: 'form-42' },
        fakeFetch as unknown as typeof fetch
      )
    ).rejects.toThrow('Kit API error: 422');
  });

  it('throws when adding the subscriber to the form fails', async () => {
    const fakeFetch = createFetchSequence(
      { ok: true, json: async () => ({ subscriber: { id: 349 } }) },
      { ok: false, status: 404 }
    );

    await expect(
      subscribeToKitForm(
        'nina@example.com',
        'result-1',
        { apiKey: 'fake-kit-key', formId: 'form-42' },
        fakeFetch as unknown as typeof fetch
      )
    ).rejects.toThrow('Kit API error: 404');
  });
});

describe('isEmailConfirmed', () => {
  it('returns true when Kit reports an active subscriber for that email', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ subscribers: [{ id: 349, state: 'active' }] }),
    });

    const confirmed = await isEmailConfirmed(
      'nina@example.com',
      { apiKey: 'fake-kit-key', formId: 'form-42' },
      fakeFetch as unknown as typeof fetch
    );

    expect(confirmed).toBe(true);
    expect(fakeFetch).toHaveBeenCalledWith(
      'https://api.kit.com/v4/subscribers?email_address=nina%40example.com',
      expect.objectContaining({ headers: expect.objectContaining({ 'X-Kit-Api-Key': 'fake-kit-key' }) })
    );
  });

  it('returns false when Kit reports no active subscriber for that email', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ subscribers: [] }) });

    const confirmed = await isEmailConfirmed(
      'nina@example.com',
      { apiKey: 'fake-kit-key', formId: 'form-42' },
      fakeFetch as unknown as typeof fetch
    );

    expect(confirmed).toBe(false);
  });

  it('throws when the Kit API returns a non-OK status', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(
      isEmailConfirmed(
        'nina@example.com',
        { apiKey: 'fake-kit-key', formId: 'form-42' },
        fakeFetch as unknown as typeof fetch
      )
    ).rejects.toThrow('Kit API error: 500');
  });
});
