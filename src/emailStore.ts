const STORAGE_KEY = 'dino_discovery_emails';

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function saveEmail(email: string): void {
  const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[];
  if (!existing.includes(email)) {
    existing.push(email);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  }
}
