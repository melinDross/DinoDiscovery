import { describe, it, expect, beforeEach } from 'vitest';
import { isValidEmail, saveEmail } from './emailStore';

describe('isValidEmail', () => {
  it('accepts a well-formed email', () => {
    expect(isValidEmail('nina@example.com')).toBe(true);
  });

  it('rejects a malformed email', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
  });
});

describe('saveEmail', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores the email under dino_discovery_emails', () => {
    saveEmail('nina@example.com');
    const stored = JSON.parse(localStorage.getItem('dino_discovery_emails')!);
    expect(stored).toEqual(['nina@example.com']);
  });

  it('does not duplicate an already-stored email', () => {
    saveEmail('nina@example.com');
    saveEmail('nina@example.com');
    const stored = JSON.parse(localStorage.getItem('dino_discovery_emails')!);
    expect(stored).toEqual(['nina@example.com']);
  });
});
