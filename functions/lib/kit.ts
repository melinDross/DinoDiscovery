export interface KitConfig {
  apiKey: string;
  formId: string;
}

export async function subscribeToKitForm(
  email: string,
  resultId: string,
  config: KitConfig,
  fetchFn: typeof fetch = fetch
): Promise<void> {
  const response = await fetchFn(`https://api.kit.com/v4/forms/${config.formId}/subscribers`, {
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

  if (!response.ok) {
    throw new Error(`Kit API error: ${response.status}`);
  }
}
