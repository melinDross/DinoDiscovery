export function isValidAdminKey(
  providedKey: string | null,
  expectedKey: string | undefined
): boolean {
  if (!expectedKey || !providedKey) return false;

  const provided = new TextEncoder().encode(providedKey);
  const expected = new TextEncoder().encode(expectedKey);
  if (provided.length !== expected.length) return false;

  let diff = 0;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided[i] ^ expected[i];
  }
  return diff === 0;
}
