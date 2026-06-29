import { describe, it, expect, vi } from 'vitest';
import { subscribeToKitForm } from './kit';

describe('subscribeToKitForm', () => {
  it('posts the email and resultId custom field to the Kit form subscribers endpoint', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });

    await subscribeToKitForm(
      'nina@example.com',
      'result-1',
      { apiKey: 'fake-kit-key', formId: 'form-42' },
      fakeFetch as unknown as typeof fetch
    );

    expect(fakeFetch).toHaveBeenCalledWith(
      'https://api.kit.com/v4/forms/form-42/subscribers',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-Kit-Api-Key': 'fake-kit-key' }),
      })
    );
    const [, requestInit] = fakeFetch.mock.calls[0];
    const body = JSON.parse(requestInit.body as string);
    expect(body).toEqual({
      email_address: 'nina@example.com',
      fields: { dino_result_id: 'result-1' },
    });
  });

  it('throws when the Kit API returns a non-OK status', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: false, status: 422 });

    await expect(
      subscribeToKitForm(
        'nina@example.com',
        'result-1',
        { apiKey: 'fake-kit-key', formId: 'form-42' },
        fakeFetch as unknown as typeof fetch
      )
    ).rejects.toThrow('Kit API error: 422');
  });
});
