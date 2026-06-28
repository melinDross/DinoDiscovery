const STORAGE_KEY = 'dino_discovery_admin_key';

export function captureAdminKeyFromUrl(): void {
  const url = new URL(window.location.href);
  const key = url.searchParams.get('admin');
  if (!key) return;

  localStorage.setItem(STORAGE_KEY, key);
  url.searchParams.delete('admin');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function getAdminKey(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}
