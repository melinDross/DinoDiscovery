export interface KitConfig {
  apiKey: string;
  formId: string;
}

const REFERRER = 'https://dino-discovery-generator.pages.dev';

export async function subscribeToKitForm(
  email: string,
  resultId: string,
  config: KitConfig,
  fetchFn: typeof fetch = fetch
): Promise<void> {
  const createResponse = await fetchFn('https://api.kit.com/v4/subscribers', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Kit-Api-Key': config.apiKey,
    },
    body: JSON.stringify({
      email_address: email,
      fields: { dino_result_id: resultId },
    }),
  });

  if (!createResponse.ok) {
    throw new Error(`Kit API error: ${createResponse.status}`);
  }

  const created = (await createResponse.json()) as { subscriber: { id: number } };

  const addToFormResponse = await fetchFn(
    `https://api.kit.com/v4/forms/${config.formId}/subscribers/${created.subscriber.id}`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Kit-Api-Key': config.apiKey,
      },
      body: JSON.stringify({ referrer: REFERRER }),
    }
  );

  if (!addToFormResponse.ok) {
    throw new Error(`Kit API error: ${addToFormResponse.status}`);
  }
}
