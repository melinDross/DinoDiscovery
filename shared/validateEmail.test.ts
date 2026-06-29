import { describe, it, expect } from 'vitest';
import { isValidEmail } from './validateEmail';

describe('isValidEmail', () => {
  it('accepts a well-formed email', () => {
    expect(isValidEmail('nina@example.com')).toBe(true);
  });

  it('rejects a malformed email', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
  });
});
