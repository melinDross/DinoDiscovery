import { describe, it, expect } from 'vitest';
import { getResult, saveResult, setResultEmail, markEmailConfirmed } from './results';
import type { ResultRecord } from './results';

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

function createRecord(): ResultRecord {
  return {
    scientificName: 'Volcanius ferox',
    commonName: 'Volcanrex',
    description: 'Un dinosaurio feroz que vive en volcanes.',
    imageKey: 'abc123.png',
    discovererName: 'Lucía',
    attrs: {
      size: 'Gigante',
      habitat: 'Volcán',
      diet: 'Carnívoro',
      feature: 'Cuernos',
      personality: 'Feroz',
    },
    createdAt: 1000,
    email: null,
    emailConfirmed: false,
  };
}

describe('saveResult / getResult', () => {
  it('returns null for a resultId that was never saved', async () => {
    const kv = createFakeKV();
    expect(await getResult(kv, 'missing-id')).toBeNull();
  });

  it('returns the saved record for a known resultId', async () => {
    const kv = createFakeKV();
    const record = createRecord();
    await saveResult(kv, 'result-1', record);
    expect(await getResult(kv, 'result-1')).toEqual(record);
  });
});

describe('setResultEmail', () => {
  it('sets the email on an existing record without confirming it', async () => {
    const kv = createFakeKV();
    await saveResult(kv, 'result-1', createRecord());
    await setResultEmail(kv, 'result-1', 'nina@example.com');
    const updated = await getResult(kv, 'result-1');
    expect(updated?.email).toBe('nina@example.com');
    expect(updated?.emailConfirmed).toBe(false);
  });

  it('does nothing when the resultId does not exist', async () => {
    const kv = createFakeKV();
    await setResultEmail(kv, 'missing-id', 'nina@example.com');
    expect(await getResult(kv, 'missing-id')).toBeNull();
  });
});

describe('markEmailConfirmed', () => {
  it('marks an existing record as confirmed', async () => {
    const kv = createFakeKV();
    await saveResult(kv, 'result-1', createRecord());
    await setResultEmail(kv, 'result-1', 'nina@example.com');
    await markEmailConfirmed(kv, 'result-1');
    const updated = await getResult(kv, 'result-1');
    expect(updated?.emailConfirmed).toBe(true);
  });

  it('does nothing when the resultId does not exist', async () => {
    const kv = createFakeKV();
    await markEmailConfirmed(kv, 'missing-id');
    expect(await getResult(kv, 'missing-id')).toBeNull();
  });
});
