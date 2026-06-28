import { describe, it, expect, beforeEach } from 'vitest';
import { captureAdminKeyFromUrl, getAdminKey } from './adminAuth';

const STORAGE_KEY = 'dino_discovery_admin_key';

describe('adminAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('returns null when no admin key has been captured', () => {
    expect(getAdminKey()).toBeNull();
  });

  it('captures an admin key from the ?admin= query param and stores it', () => {
    window.history.replaceState({}, '', '/?admin=my-secret-key');
    captureAdminKeyFromUrl();
    expect(getAdminKey()).toBe('my-secret-key');
  });

  it('removes the admin query param from the URL after capturing it', () => {
    window.history.replaceState({}, '', '/?admin=my-secret-key&foo=bar');
    captureAdminKeyFromUrl();
    expect(window.location.search).toBe('?foo=bar');
  });

  it('keeps a previously stored key when the URL has no admin param', () => {
    localStorage.setItem(STORAGE_KEY, 'existing-key');
    window.history.replaceState({}, '', '/');
    captureAdminKeyFromUrl();
    expect(getAdminKey()).toBe('existing-key');
  });
});
