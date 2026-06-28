import { describe, it, expect } from 'vitest';
import { isValidAdminKey } from './adminAuth';

describe('isValidAdminKey', () => {
  it('returns true when the provided key matches the expected key', () => {
    expect(isValidAdminKey('secret-123', 'secret-123')).toBe(true);
  });

  it('returns false when the provided key does not match', () => {
    expect(isValidAdminKey('wrong-key', 'secret-123')).toBe(false);
  });

  it('returns false when no expected key is configured', () => {
    expect(isValidAdminKey('secret-123', undefined)).toBe(false);
  });

  it('returns false when no key is provided', () => {
    expect(isValidAdminKey(null, 'secret-123')).toBe(false);
  });

  it('returns false when keys have different lengths', () => {
    expect(isValidAdminKey('short', 'much-longer-secret')).toBe(false);
  });
});
