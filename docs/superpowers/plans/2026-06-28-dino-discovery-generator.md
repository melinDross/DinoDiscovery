# Dino Discovery Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Dino Discovery Generator MVP — a React app where kids pick dinosaur attributes, get an AI-generated dinosaur (name, description, image) via a Cloudflare Pages Function backend, and download a discovery certificate after an email gate.

**Architecture:** Single Cloudflare Pages project. Frontend is React + Vite + Tailwind in `src/`. Backend logic lives in `functions/` as Cloudflare Pages Functions (`/api/generate-dino`, `/images/:key`), backed by two KV namespaces (rate limit, cache) and one R2 bucket (permanent image storage). Shared TypeScript types live in `shared/types.ts`.

**Tech Stack:** React 18, Vite, TypeScript (strict), Tailwind CSS, Vitest + @testing-library/react, html2canvas, Cloudflare Pages Functions, Wrangler, Cloudflare KV + R2, Anthropic API (`claude-haiku-4-5`), OpenAI API (`dall-e-3`, standard, 1024x1024).

## Global Constraints

- Backend never exposes `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` to the client — both live only as Worker/Pages secrets.
- Rate limit: max 5 generations per IP per hour (cache hits count toward the limit).
- Cache key is derived only from the 5 dinosaur attributes (size, habitat, diet, feature, personality) — never from `discovererName`.
- DALL-E 3 image URLs expire (~1h) — every generated image must be re-uploaded to R2 before being cached.
- Certificate downloads only as PNG (no PDF in MVP).
- Email gate stores emails only in `localStorage` under key `dino_discovery_emails` — no backend persistence.
- UI copy and attribute labels are in Spanish (per approved design): Tamaño (Pequeño/Mediano/Gigante), Hábitat (Selva/Desierto/Océano/Montaña/Volcán), Dieta (Carnívoro/Herbívoro/Omnívoro), Característica especial (Cuernos/Alas/Escamas coloridas/Cola poderosa/Armadura/Súper garras), Personalidad (Feroz/Amigable/Veloz/Sigiloso).
- No PDF export, no user auth, no E2E test suite in this MVP.

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`
- Create: `src/smoke.test.ts`
- Create: `wrangler.jsonc`
- Create: `.dev.vars.example`
- Create: `.gitignore` (extend existing)
- Create: `README.md` (extend existing)

**Interfaces:**
- Produces: a working Vite dev server, a working `npm run build`, and a working `npm test` (Vitest) that later tasks add real tests to.

- [ ] **Step 1: Initialize package.json and install dependencies**

```bash
cd /Users/samuelbarrado/proyectos-web/Dino-discovery
npm init -y
npm install react react-dom html2canvas
npm install -D vite @vitejs/plugin-react typescript tailwindcss postcss autoprefixer \
  vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom \
  @types/react @types/react-dom @cloudflare/workers-types wrangler
```

- [ ] **Step 2: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "types": ["vite/client", "@cloudflare/workers-types"]
  },
  "include": ["src", "functions", "shared"]
}
```

- [ ] **Step 3: Write vite.config.ts with Vitest config**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
});
```

- [ ] **Step 4: Write src/test-setup.ts**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Write tailwind.config.js and postcss.config.js**

```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

```js
// postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: Write src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 7: Write index.html**

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dino Discovery Generator</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Write src/main.tsx and a placeholder src/App.tsx**

```tsx
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

```tsx
// src/App.tsx
export default function App() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-100 to-blue-100 p-4">
      <h1 className="text-3xl font-bold text-center text-purple-700">
        Generador de Descubrimiento de Dinosaurios
      </h1>
    </main>
  );
}
```

- [ ] **Step 9: Write a smoke test to verify Vitest works**

```ts
// src/smoke.test.ts
import { describe, it, expect } from 'vitest';

describe('smoke test', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 10: Run the smoke test**

Run: `npx vitest run`
Expected: `1 passed`

- [ ] **Step 11: Add scripts to package.json**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 12: Verify build works**

Run: `npm run build`
Expected: exits 0, `dist/` is created.

- [ ] **Step 13: Write wrangler.jsonc with placeholder bindings**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "dino-discovery-generator",
  "pages_build_output_dir": "dist",
  "compatibility_date": "2026-06-28",
  "compatibility_flags": ["nodejs_compat"],
  "kv_namespaces": [
    { "binding": "RATE_LIMIT_KV", "id": "REPLACE_WITH_RATE_LIMIT_KV_ID" },
    { "binding": "CACHE_KV", "id": "REPLACE_WITH_CACHE_KV_ID" }
  ],
  "r2_buckets": [
    { "binding": "DINO_IMAGES", "bucket_name": "dino-discovery-images" }
  ]
}
```

- [ ] **Step 14: Write .dev.vars.example**

```
ANTHROPIC_API_KEY=sk-ant-replace-me
OPENAI_API_KEY=sk-replace-me
```

- [ ] **Step 15: Extend .gitignore**

```
node_modules/
dist/
.wrangler/
.dev.vars
docs/
```

- [ ] **Step 16: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts tailwind.config.js \
  postcss.config.js index.html src/ wrangler.jsonc .dev.vars.example .gitignore
git commit -m "Scaffold Vite + React + Tailwind + Vitest project with Pages config"
```

---

## Task 2: Shared types and cache key hash

**Files:**
- Create: `shared/types.ts`
- Create: `functions/lib/hash.ts`
- Test: `functions/lib/hash.test.ts`

**Interfaces:**
- Produces: `DinoAttributes`, `GenerateDinoRequest`, `GenerateDinoResponse`, `ApiErrorResponse` types in `shared/types.ts`; `computeCacheKey(attrs: DinoAttributes): Promise<string>` in `functions/lib/hash.ts`.

- [ ] **Step 1: Write shared/types.ts**

```ts
export type Size = 'Pequeño' | 'Mediano' | 'Gigante';
export type Habitat = 'Selva' | 'Desierto' | 'Océano' | 'Montaña' | 'Volcán';
export type Diet = 'Carnívoro' | 'Herbívoro' | 'Omnívoro';
export type Feature =
  | 'Cuernos'
  | 'Alas'
  | 'Escamas coloridas'
  | 'Cola poderosa'
  | 'Armadura'
  | 'Súper garras';
export type Personality = 'Feroz' | 'Amigable' | 'Veloz' | 'Sigiloso';

export interface DinoAttributes {
  size: Size;
  habitat: Habitat;
  diet: Diet;
  feature: Feature;
  personality: Personality;
}

export interface GenerateDinoRequest extends DinoAttributes {
  discovererName: string;
}

export interface GenerateDinoResponse {
  scientificName: string;
  commonName: string;
  description: string;
  imageUrl: string;
}

export interface ApiErrorResponse {
  error: 'RATE_LIMITED' | 'API_ERROR';
  message?: string;
  retryAfterSeconds?: number;
}
```

- [ ] **Step 2: Write the failing test for computeCacheKey**

```ts
// functions/lib/hash.test.ts
import { describe, it, expect } from 'vitest';
import { computeCacheKey } from './hash';
import type { DinoAttributes } from '../../shared/types';

const baseAttrs: DinoAttributes = {
  size: 'Gigante',
  habitat: 'Volcán',
  diet: 'Carnívoro',
  feature: 'Cuernos',
  personality: 'Feroz',
};

describe('computeCacheKey', () => {
  it('produces the same key for identical attributes', async () => {
    const a = await computeCacheKey(baseAttrs);
    const b = await computeCacheKey({ ...baseAttrs });
    expect(a).toBe(b);
  });

  it('produces a different key when an attribute changes', async () => {
    const a = await computeCacheKey(baseAttrs);
    const b = await computeCacheKey({ ...baseAttrs, size: 'Pequeño' });
    expect(a).not.toBe(b);
  });

  it('returns a 64-character hex string (SHA-256)', async () => {
    const key = await computeCacheKey(baseAttrs);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run functions/lib/hash.test.ts`
Expected: FAIL — `Cannot find module './hash'`

- [ ] **Step 4: Implement functions/lib/hash.ts**

```ts
import type { DinoAttributes } from '../../shared/types';

export async function computeCacheKey(attrs: DinoAttributes): Promise<string> {
  const canonical = [
    attrs.size,
    attrs.habitat,
    attrs.diet,
    attrs.feature,
    attrs.personality,
  ].join('|');
  const data = new TextEncoder().encode(canonical);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run functions/lib/hash.test.ts`
Expected: `3 passed`

- [ ] **Step 6: Commit**

```bash
git add shared/types.ts functions/lib/hash.ts functions/lib/hash.test.ts
git commit -m "Add shared types and deterministic cache key hashing"
```

---

## Task 3: Rate limit logic

**Files:**
- Create: `functions/lib/rateLimit.ts`
- Test: `functions/lib/rateLimit.test.ts`

**Interfaces:**
- Consumes: nothing from prior tasks.
- Produces: `KVLike` interface, `checkAndIncrementRateLimit(kv: KVLike, ip: string): Promise<{ allowed: boolean; retryAfterSeconds: number }>` — used by Task 8.

- [ ] **Step 1: Write the failing test**

```ts
// functions/lib/rateLimit.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { checkAndIncrementRateLimit, type KVLike } from './rateLimit';

function createFakeKV(): KVLike {
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

describe('checkAndIncrementRateLimit', () => {
  let kv: KVLike;

  beforeEach(() => {
    kv = createFakeKV();
  });

  it('allows the first 5 requests from an IP', async () => {
    for (let i = 0; i < 5; i++) {
      const result = await checkAndIncrementRateLimit(kv, '1.2.3.4');
      expect(result.allowed).toBe(true);
    }
  });

  it('rejects the 6th request from the same IP within the window', async () => {
    for (let i = 0; i < 5; i++) {
      await checkAndIncrementRateLimit(kv, '1.2.3.4');
    }
    const result = await checkAndIncrementRateLimit(kv, '1.2.3.4');
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('tracks different IPs independently', async () => {
    for (let i = 0; i < 5; i++) {
      await checkAndIncrementRateLimit(kv, '1.1.1.1');
    }
    const result = await checkAndIncrementRateLimit(kv, '2.2.2.2');
    expect(result.allowed).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run functions/lib/rateLimit.test.ts`
Expected: FAIL — `Cannot find module './rateLimit'`

- [ ] **Step 3: Implement functions/lib/rateLimit.ts**

```ts
export interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

const LIMIT = 5;
const WINDOW_SECONDS = 3600;

export async function checkAndIncrementRateLimit(
  kv: KVLike,
  ip: string
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const key = `ratelimit:${ip}`;
  const raw = await kv.get(key);
  const count = raw ? parseInt(raw, 10) : 0;

  if (count >= LIMIT) {
    return { allowed: false, retryAfterSeconds: WINDOW_SECONDS };
  }

  await kv.put(key, String(count + 1), { expirationTtl: WINDOW_SECONDS });
  return { allowed: true, retryAfterSeconds: 0 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run functions/lib/rateLimit.test.ts`
Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add functions/lib/rateLimit.ts functions/lib/rateLimit.test.ts
git commit -m "Add per-IP rate limiting backed by KV"
```

---

## Task 4: Cache get/set logic

**Files:**
- Create: `functions/lib/cache.ts`
- Test: `functions/lib/cache.test.ts`

**Interfaces:**
- Consumes: `KVLike` from `./rateLimit`.
- Produces: `CachedDino` type, `getCachedDino(kv, cacheKey): Promise<CachedDino | null>`, `setCachedDino(kv, cacheKey, value): Promise<void>` — used by Task 8.

- [ ] **Step 1: Write the failing test**

```ts
// functions/lib/cache.test.ts
import { describe, it, expect } from 'vitest';
import { getCachedDino, setCachedDino, type CachedDino } from './cache';
import type { KVLike } from './rateLimit';

function createFakeKV(): KVLike {
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

describe('cache', () => {
  it('returns null when the key is not cached', async () => {
    const kv = createFakeKV();
    const result = await getCachedDino(kv, 'missing-key');
    expect(result).toBeNull();
  });

  it('round-trips a cached dino', async () => {
    const kv = createFakeKV();
    const dino: CachedDino = {
      scientificName: 'Volcanius ferox',
      commonName: 'Volcanrex',
      description: 'Un dinosaurio feroz que vive en volcanes.',
      imageKey: 'abc123',
    };
    await setCachedDino(kv, 'abc123', dino);
    const result = await getCachedDino(kv, 'abc123');
    expect(result).toEqual(dino);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run functions/lib/cache.test.ts`
Expected: FAIL — `Cannot find module './cache'`

- [ ] **Step 3: Implement functions/lib/cache.ts**

```ts
import type { KVLike } from './rateLimit';

export interface CachedDino {
  scientificName: string;
  commonName: string;
  description: string;
  imageKey: string;
}

export async function getCachedDino(kv: KVLike, cacheKey: string): Promise<CachedDino | null> {
  const raw = await kv.get(`cache:${cacheKey}`);
  return raw ? (JSON.parse(raw) as CachedDino) : null;
}

export async function setCachedDino(
  kv: KVLike,
  cacheKey: string,
  value: CachedDino
): Promise<void> {
  await kv.put(`cache:${cacheKey}`, JSON.stringify(value));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run functions/lib/cache.test.ts`
Expected: `2 passed`

- [ ] **Step 5: Commit**

```bash
git add functions/lib/cache.ts functions/lib/cache.test.ts
git commit -m "Add KV-backed dino result cache"
```

---

## Task 5: Anthropic text generation client

**Files:**
- Create: `functions/lib/anthropic.ts`
- Test: `functions/lib/anthropic.test.ts`

**Interfaces:**
- Consumes: `DinoAttributes` from `shared/types`.
- Produces: `DinoText` type, `generateDinoText(attrs, apiKey, fetchFn?): Promise<DinoText>` — used by Task 8.

- [ ] **Step 1: Write the failing test**

```ts
// functions/lib/anthropic.test.ts
import { describe, it, expect, vi } from 'vitest';
import { generateDinoText } from './anthropic';
import type { DinoAttributes } from '../../shared/types';

const attrs: DinoAttributes = {
  size: 'Gigante',
  habitat: 'Volcán',
  diet: 'Carnívoro',
  feature: 'Cuernos',
  personality: 'Feroz',
};

describe('generateDinoText', () => {
  it('parses scientificName, commonName and description from the Anthropic response', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              scientificName: 'Volcanius ferox',
              commonName: 'Volcanrex',
              description: 'Un dinosaurio feroz que vive en volcanes.',
            }),
          },
        ],
      }),
    });

    const result = await generateDinoText(attrs, 'fake-key', fakeFetch as unknown as typeof fetch);

    expect(result).toEqual({
      scientificName: 'Volcanius ferox',
      commonName: 'Volcanrex',
      description: 'Un dinosaurio feroz que vive en volcanes.',
    });
    expect(fakeFetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('throws when the Anthropic API returns a non-OK status', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(
      generateDinoText(attrs, 'fake-key', fakeFetch as unknown as typeof fetch)
    ).rejects.toThrow('Anthropic API error: 500');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run functions/lib/anthropic.test.ts`
Expected: FAIL — `Cannot find module './anthropic'`

- [ ] **Step 3: Implement functions/lib/anthropic.ts**

```ts
import type { DinoAttributes } from '../../shared/types';

export interface DinoText {
  scientificName: string;
  commonName: string;
  description: string;
}

export async function generateDinoText(
  attrs: DinoAttributes,
  apiKey: string,
  fetchFn: typeof fetch = fetch
): Promise<DinoText> {
  const prompt = `Crea un dinosaurio ficticio para niños con estos atributos:
Tamaño: ${attrs.size}
Hábitat: ${attrs.habitat}
Dieta: ${attrs.diet}
Característica especial: ${attrs.feature}
Personalidad: ${attrs.personality}

Responde SOLO con un objeto JSON con esta forma exacta, sin texto adicional:
{"scientificName": "...", "commonName": "...", "description": "..."}
La descripción debe tener 2-3 líneas, ser divertida y apta para niños de 5 a 10 años, en español.`;

  const response = await fetchFn('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = (await response.json()) as { content: { type: string; text: string }[] };
  const textBlock = data.content.find((block) => block.type === 'text');
  if (!textBlock) {
    throw new Error('No text content in Anthropic response');
  }

  return JSON.parse(textBlock.text) as DinoText;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run functions/lib/anthropic.test.ts`
Expected: `2 passed`

- [ ] **Step 5: Commit**

```bash
git add functions/lib/anthropic.ts functions/lib/anthropic.test.ts
git commit -m "Add Anthropic claude-haiku-4-5 client for dino text generation"
```

---

## Task 6: OpenAI image generation client

**Files:**
- Create: `functions/lib/openai.ts`
- Test: `functions/lib/openai.test.ts`

**Interfaces:**
- Consumes: `DinoAttributes` from `shared/types`.
- Produces: `generateDinoImage(attrs, apiKey, fetchFn?): Promise<string>` (returns the temporary DALL-E image URL) — used by Task 8.

- [ ] **Step 1: Write the failing test**

```ts
// functions/lib/openai.test.ts
import { describe, it, expect, vi } from 'vitest';
import { generateDinoImage } from './openai';
import type { DinoAttributes } from '../../shared/types';

const attrs: DinoAttributes = {
  size: 'Gigante',
  habitat: 'Volcán',
  diet: 'Carnívoro',
  feature: 'Cuernos',
  personality: 'Feroz',
};

describe('generateDinoImage', () => {
  it('returns the image URL from the OpenAI response', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ url: 'https://oaidalleapi.example/temp-image.png' }] }),
    });

    const url = await generateDinoImage(attrs, 'fake-key', fakeFetch as unknown as typeof fetch);

    expect(url).toBe('https://oaidalleapi.example/temp-image.png');
    expect(fakeFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/images/generations',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('throws when the OpenAI API returns a non-OK status', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(
      generateDinoImage(attrs, 'fake-key', fakeFetch as unknown as typeof fetch)
    ).rejects.toThrow('OpenAI API error: 500');
  });

  it('throws when the response has no image URL', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) });

    await expect(
      generateDinoImage(attrs, 'fake-key', fakeFetch as unknown as typeof fetch)
    ).rejects.toThrow('No image URL in OpenAI response');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run functions/lib/openai.test.ts`
Expected: FAIL — `Cannot find module './openai'`

- [ ] **Step 3: Implement functions/lib/openai.ts**

```ts
import type { DinoAttributes } from '../../shared/types';

export async function generateDinoImage(
  attrs: DinoAttributes,
  apiKey: string,
  fetchFn: typeof fetch = fetch
): Promise<string> {
  const prompt = `A friendly cartoon dinosaur for a children's app, ${attrs.size} size, living in ${attrs.habitat}, ${attrs.diet} diet, with ${attrs.feature}, ${attrs.personality} personality. Colorful, simple, no text, no watermark, white background.`;

  const response = await fetchFn('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = (await response.json()) as { data: { url: string }[] };
  if (!data.data?.[0]?.url) {
    throw new Error('No image URL in OpenAI response');
  }
  return data.data[0].url;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run functions/lib/openai.test.ts`
Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add functions/lib/openai.ts functions/lib/openai.test.ts
git commit -m "Add OpenAI dall-e-3 client for dino image generation"
```

---

## Task 7: R2 image storage helper

**Files:**
- Create: `functions/lib/r2.ts`
- Test: `functions/lib/r2.test.ts`

**Interfaces:**
- Consumes: nothing from prior tasks.
- Produces: `R2BucketLike` interface, `storeImageInR2(bucket, key, imageUrl, fetchFn?): Promise<void>` — used by Task 8.

- [ ] **Step 1: Write the failing test**

```ts
// functions/lib/r2.test.ts
import { describe, it, expect, vi } from 'vitest';
import { storeImageInR2, type R2BucketLike } from './r2';

describe('storeImageInR2', () => {
  it('downloads the image and puts it in the bucket with the given key', async () => {
    const fakeBytes = new ArrayBuffer(4);
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => fakeBytes,
    });
    const put = vi.fn().mockResolvedValue(undefined);
    const bucket: R2BucketLike = { put };

    await storeImageInR2(
      bucket,
      'abc123.png',
      'https://oaidalleapi.example/temp.png',
      fakeFetch as unknown as typeof fetch
    );

    expect(fakeFetch).toHaveBeenCalledWith('https://oaidalleapi.example/temp.png');
    expect(put).toHaveBeenCalledWith('abc123.png', fakeBytes, {
      httpMetadata: { contentType: 'image/png' },
    });
  });

  it('throws when the image download fails', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const bucket: R2BucketLike = { put: vi.fn() };

    await expect(
      storeImageInR2(bucket, 'abc123.png', 'https://example/missing.png', fakeFetch as unknown as typeof fetch)
    ).rejects.toThrow('Failed to download image: 404');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run functions/lib/r2.test.ts`
Expected: FAIL — `Cannot find module './r2'`

- [ ] **Step 3: Implement functions/lib/r2.ts**

```ts
export interface R2BucketLike {
  put(
    key: string,
    value: ArrayBuffer | ReadableStream,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<unknown>;
}

export async function storeImageInR2(
  bucket: R2BucketLike,
  key: string,
  imageUrl: string,
  fetchFn: typeof fetch = fetch
): Promise<void> {
  const response = await fetchFn(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  await bucket.put(key, buffer, { httpMetadata: { contentType: 'image/png' } });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run functions/lib/r2.test.ts`
Expected: `2 passed`

- [ ] **Step 5: Commit**

```bash
git add functions/lib/r2.ts functions/lib/r2.test.ts
git commit -m "Add R2 helper to persist DALL-E images permanently"
```

---

## Task 8: generate-dino and images Pages Functions

**Files:**
- Create: `functions/api/generate-dino.ts`
- Create: `functions/images/[key].ts`
- Test: `functions/api/generate-dino.test.ts`

**Interfaces:**
- Consumes: `computeCacheKey` (Task 2), `checkAndIncrementRateLimit`/`KVLike` (Task 3), `getCachedDino`/`setCachedDino`/`CachedDino` (Task 4), `generateDinoText` (Task 5), `generateDinoImage` (Task 6), `storeImageInR2`/`R2BucketLike` (Task 7), `GenerateDinoRequest`/`DinoAttributes` (shared types).
- Produces: `onRequestPost` handler for `POST /api/generate-dino`, `onRequestGet` handler for `GET /images/:key` — consumed by the deployed Pages project (Task 17) and by the frontend `src/api.ts` (Task 12).

- [ ] **Step 1: Write the failing tests**

```ts
// functions/api/generate-dino.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/anthropic', () => ({
  generateDinoText: vi.fn(),
}));
vi.mock('../lib/openai', () => ({
  generateDinoImage: vi.fn(),
}));
vi.mock('../lib/r2', () => ({
  storeImageInR2: vi.fn(),
}));

import { onRequestPost } from './generate-dino';
import { generateDinoText } from '../lib/anthropic';
import { generateDinoImage } from '../lib/openai';
import { storeImageInR2 } from '../lib/r2';

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

function createEnv() {
  return {
    RATE_LIMIT_KV: createFakeKV(),
    CACHE_KV: createFakeKV(),
    DINO_IMAGES: { put: vi.fn() },
    ANTHROPIC_API_KEY: 'fake-anthropic-key',
    OPENAI_API_KEY: 'fake-openai-key',
  };
}

const validBody = {
  size: 'Gigante',
  habitat: 'Volcán',
  diet: 'Carnívoro',
  feature: 'Cuernos',
  personality: 'Feroz',
  discovererName: 'Lucía',
};

function createRequest(body: unknown, ip = '1.2.3.4') {
  return new Request('https://example.com/api/generate-dino', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'CF-Connecting-IP': ip },
    body: JSON.stringify(body),
  });
}

describe('onRequestPost /api/generate-dino', () => {
  beforeEach(() => {
    vi.mocked(generateDinoText).mockResolvedValue({
      scientificName: 'Volcanius ferox',
      commonName: 'Volcanrex',
      description: 'Un dinosaurio feroz que vive en volcanes.',
    });
    vi.mocked(generateDinoImage).mockResolvedValue('https://oaidalleapi.example/temp.png');
    vi.mocked(storeImageInR2).mockResolvedValue(undefined);
  });

  it('returns 429 when the IP has exceeded the rate limit', async () => {
    const env = createEnv();
    for (let i = 0; i < 5; i++) {
      await onRequestPost({ request: createRequest(validBody), env } as any);
    }
    const response = await onRequestPost({ request: createRequest(validBody), env } as any);
    expect(response.status).toBe(429);
    const json = await response.json();
    expect(json.error).toBe('RATE_LIMITED');
  });

  it('returns 400 when attributes are invalid', async () => {
    const env = createEnv();
    const response = await onRequestPost({
      request: createRequest({ ...validBody, size: 'NotASize' }),
      env,
    } as any);
    expect(response.status).toBe(400);
  });

  it('generates a new dino on cache miss and returns it', async () => {
    const env = createEnv();
    const response = await onRequestPost({ request: createRequest(validBody), env } as any);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.scientificName).toBe('Volcanius ferox');
    expect(json.imageUrl).toMatch(/^\/images\/.+\.png$/);
    expect(generateDinoText).toHaveBeenCalledTimes(1);
    expect(generateDinoImage).toHaveBeenCalledTimes(1);
    expect(storeImageInR2).toHaveBeenCalledTimes(1);
  });

  it('serves from cache on the second identical request without calling upstream APIs again', async () => {
    const env = createEnv();
    await onRequestPost({ request: createRequest(validBody, '9.9.9.9') } as any && { request: createRequest(validBody, '9.9.9.9'), env } as any);
    await onRequestPost({ request: createRequest(validBody, '9.9.9.8'), env } as any);
    const response = await onRequestPost({ request: createRequest(validBody, '9.9.9.7'), env } as any);
    expect(response.status).toBe(200);
    expect(generateDinoText).toHaveBeenCalledTimes(1);
    expect(generateDinoImage).toHaveBeenCalledTimes(1);
  });

  it('returns 502 with a generic message when an upstream API fails', async () => {
    const env = createEnv();
    vi.mocked(generateDinoText).mockRejectedValueOnce(new Error('Anthropic API error: 500'));
    const response = await onRequestPost({ request: createRequest(validBody, '5.5.5.5'), env } as any);
    expect(response.status).toBe(502);
    const json = await response.json();
    expect(json.error).toBe('API_ERROR');
    expect(json.message).not.toMatch(/Anthropic/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run functions/api/generate-dino.test.ts`
Expected: FAIL — `Cannot find module './generate-dino'`

- [ ] **Step 3: Implement functions/api/generate-dino.ts**

```ts
import type { DinoAttributes, GenerateDinoRequest } from '../../shared/types';
import { computeCacheKey } from '../lib/hash';
import { checkAndIncrementRateLimit, type KVLike } from '../lib/rateLimit';
import { getCachedDino, setCachedDino } from '../lib/cache';
import { generateDinoText } from '../lib/anthropic';
import { generateDinoImage } from '../lib/openai';
import { storeImageInR2, type R2BucketLike } from '../lib/r2';

interface Env {
  RATE_LIMIT_KV: KVLike;
  CACHE_KV: KVLike;
  DINO_IMAGES: R2BucketLike;
  ANTHROPIC_API_KEY: string;
  OPENAI_API_KEY: string;
}

const VALID_SIZES = ['Pequeño', 'Mediano', 'Gigante'];
const VALID_HABITATS = ['Selva', 'Desierto', 'Océano', 'Montaña', 'Volcán'];
const VALID_DIETS = ['Carnívoro', 'Herbívoro', 'Omnívoro'];
const VALID_FEATURES = ['Cuernos', 'Alas', 'Escamas coloridas', 'Cola poderosa', 'Armadura', 'Súper garras'];
const VALID_PERSONALITIES = ['Feroz', 'Amigable', 'Veloz', 'Sigiloso'];

function isValidRequest(body: unknown): body is GenerateDinoRequest {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    VALID_SIZES.includes(b.size as string) &&
    VALID_HABITATS.includes(b.habitat as string) &&
    VALID_DIETS.includes(b.diet as string) &&
    VALID_FEATURES.includes(b.feature as string) &&
    VALID_PERSONALITIES.includes(b.personality as string) &&
    typeof b.discovererName === 'string' &&
    b.discovererName.trim().length > 0
  );
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';

  const rateLimitResult = await checkAndIncrementRateLimit(env.RATE_LIMIT_KV, ip);
  if (!rateLimitResult.allowed) {
    return Response.json(
      { error: 'RATE_LIMITED', retryAfterSeconds: rateLimitResult.retryAfterSeconds },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'API_ERROR', message: 'Cuerpo de la petición inválido' }, { status: 400 });
  }

  if (!isValidRequest(body)) {
    return Response.json({ error: 'API_ERROR', message: 'Atributos inválidos' }, { status: 400 });
  }

  const attrs: DinoAttributes = {
    size: body.size,
    habitat: body.habitat,
    diet: body.diet,
    feature: body.feature,
    personality: body.personality,
  };

  const cacheKey = await computeCacheKey(attrs);
  const cached = await getCachedDino(env.CACHE_KV, cacheKey);
  if (cached) {
    return Response.json({
      scientificName: cached.scientificName,
      commonName: cached.commonName,
      description: cached.description,
      imageUrl: `/images/${cached.imageKey}.png`,
    });
  }

  try {
    const text = await generateDinoText(attrs, env.ANTHROPIC_API_KEY);
    const tempImageUrl = await generateDinoImage(attrs, env.OPENAI_API_KEY);
    const imageKey = `${cacheKey}.png`;
    await storeImageInR2(env.DINO_IMAGES, imageKey, tempImageUrl);

    await setCachedDino(env.CACHE_KV, cacheKey, {
      scientificName: text.scientificName,
      commonName: text.commonName,
      description: text.description,
      imageKey: cacheKey,
    });

    return Response.json({
      scientificName: text.scientificName,
      commonName: text.commonName,
      description: text.description,
      imageUrl: `/images/${imageKey}`,
    });
  } catch {
    return Response.json(
      { error: 'API_ERROR', message: 'No se pudo generar el dinosaurio' },
      { status: 502 }
    );
  }
}
```

- [ ] **Step 4: Implement functions/images/[key].ts**

```ts
interface ImagesEnv {
  DINO_IMAGES: R2Bucket;
}

export const onRequestGet: PagesFunction<ImagesEnv> = async (context) => {
  const key = context.params.key as string;
  const object = await context.env.DINO_IMAGES.get(key);
  if (!object) {
    return new Response('Not found', { status: 404 });
  }
  return new Response(object.body, {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run functions/api/generate-dino.test.ts`
Expected: `5 passed`

- [ ] **Step 6: Commit**

```bash
git add functions/api/generate-dino.ts functions/api/generate-dino.test.ts functions/images/
git commit -m "Add generate-dino orchestration endpoint and image serving function"
```

---

## Task 9: Frontend attribute data and selection validation

**Files:**
- Create: `src/data/attributes.ts`
- Create: `src/validation.ts`
- Test: `src/validation.test.ts`

**Interfaces:**
- Consumes: `Size`, `Habitat`, `Diet`, `Feature`, `Personality`, `DinoAttributes` from `shared/types`.
- Produces: `SIZES`, `HABITATS`, `DIETS`, `FEATURES`, `PERSONALITIES` arrays; `isSelectionComplete(partial, discovererName): partial is DinoAttributes` — used by Task 11.

- [ ] **Step 1: Write src/data/attributes.ts**

```ts
import type { Size, Habitat, Diet, Feature, Personality } from '../../shared/types';

export const SIZES: Size[] = ['Pequeño', 'Mediano', 'Gigante'];
export const HABITATS: Habitat[] = ['Selva', 'Desierto', 'Océano', 'Montaña', 'Volcán'];
export const DIETS: Diet[] = ['Carnívoro', 'Herbívoro', 'Omnívoro'];
export const FEATURES: Feature[] = [
  'Cuernos',
  'Alas',
  'Escamas coloridas',
  'Cola poderosa',
  'Armadura',
  'Súper garras',
];
export const PERSONALITIES: Personality[] = ['Feroz', 'Amigable', 'Veloz', 'Sigiloso'];
```

- [ ] **Step 2: Write the failing test for isSelectionComplete**

```ts
// src/validation.test.ts
import { describe, it, expect } from 'vitest';
import { isSelectionComplete } from './validation';
import type { DinoAttributes } from '../shared/types';

const fullAttrs: DinoAttributes = {
  size: 'Gigante',
  habitat: 'Volcán',
  diet: 'Carnívoro',
  feature: 'Cuernos',
  personality: 'Feroz',
};

describe('isSelectionComplete', () => {
  it('returns true when all attributes and a non-empty name are present', () => {
    expect(isSelectionComplete(fullAttrs, 'Lucía')).toBe(true);
  });

  it('returns false when an attribute is missing', () => {
    expect(isSelectionComplete({ ...fullAttrs, size: null }, 'Lucía')).toBe(false);
  });

  it('returns false when the discoverer name is empty or whitespace', () => {
    expect(isSelectionComplete(fullAttrs, '   ')).toBe(false);
    expect(isSelectionComplete(fullAttrs, '')).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/validation.test.ts`
Expected: FAIL — `Cannot find module './validation'`

- [ ] **Step 4: Implement src/validation.ts**

```ts
import type { DinoAttributes } from '../shared/types';

export type NullablePartialAttributes = {
  [K in keyof DinoAttributes]: DinoAttributes[K] | null;
};

export function isSelectionComplete(
  partial: NullablePartialAttributes,
  discovererName: string
): partial is DinoAttributes {
  return (
    !!partial.size &&
    !!partial.habitat &&
    !!partial.diet &&
    !!partial.feature &&
    !!partial.personality &&
    discovererName.trim().length > 0
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/validation.test.ts`
Expected: `3 passed`

- [ ] **Step 6: Commit**

```bash
git add src/data/attributes.ts src/validation.ts src/validation.test.ts
git commit -m "Add attribute data and selection-complete validation"
```

---

## Task 10: AttributeGroup component

**Files:**
- Create: `src/components/AttributeGroup.tsx`
- Test: `src/components/AttributeGroup.test.tsx`

**Interfaces:**
- Consumes: nothing from prior tasks (generic component).
- Produces: `AttributeGroup<T extends string>({ label, options, selected, onSelect })` — used by Task 11.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/AttributeGroup.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AttributeGroup } from './AttributeGroup';

describe('AttributeGroup', () => {
  it('renders the label and all options', () => {
    render(
      <AttributeGroup label="Tamaño" options={['Pequeño', 'Mediano', 'Gigante']} selected={null} onSelect={() => {}} />
    );
    expect(screen.getByText('Tamaño')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gigante' })).toBeInTheDocument();
  });

  it('marks the selected option as pressed', () => {
    render(
      <AttributeGroup
        label="Tamaño"
        options={['Pequeño', 'Mediano', 'Gigante']}
        selected="Mediano"
        onSelect={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: 'Mediano' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Pequeño' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onSelect with the clicked option', async () => {
    const onSelect = vi.fn();
    render(
      <AttributeGroup label="Tamaño" options={['Pequeño', 'Mediano', 'Gigante']} selected={null} onSelect={onSelect} />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Gigante' }));
    expect(onSelect).toHaveBeenCalledWith('Gigante');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/AttributeGroup.test.tsx`
Expected: FAIL — `Cannot find module './AttributeGroup'`

- [ ] **Step 3: Implement src/components/AttributeGroup.tsx**

```tsx
interface AttributeGroupProps<T extends string> {
  label: string;
  options: T[];
  selected: T | null;
  onSelect: (value: T) => void;
}

export function AttributeGroup<T extends string>({
  label,
  options,
  selected,
  onSelect,
}: AttributeGroupProps<T>) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-bold mb-2 text-purple-700">{label}</h3>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            aria-pressed={selected === option}
            className={`px-4 py-2 rounded-full font-semibold border-2 transition-colors ${
              selected === option
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-purple-700 border-purple-300 hover:bg-purple-100'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/AttributeGroup.test.tsx`
Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add src/components/AttributeGroup.tsx src/components/AttributeGroup.test.tsx
git commit -m "Add reusable AttributeGroup selector component"
```

---

## Task 11: DiscovererForm, DiscoverButton and App selection wiring

**Files:**
- Create: `src/components/DiscovererForm.tsx`
- Create: `src/components/DiscoverButton.tsx`
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `AttributeGroup` (Task 10), `SIZES`/`HABITATS`/`DIETS`/`FEATURES`/`PERSONALITIES` (Task 9), `isSelectionComplete` (Task 9).
- Produces: `App` state shape `{ size, habitat, diet, feature, personality }` (each `T | null`) plus `discovererName: string` — consumed by Task 16 when wiring the full generate flow.

- [ ] **Step 1: Write the failing test**

```tsx
// src/App.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App attribute selection', () => {
  it('disables the discover button until all attributes and a name are set', async () => {
    render(<App />);
    const button = screen.getByRole('button', { name: /Descubrir/i });
    expect(button).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Gigante' }));
    await userEvent.click(screen.getByRole('button', { name: 'Volcán' }));
    await userEvent.click(screen.getByRole('button', { name: 'Carnívoro' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cuernos' }));
    await userEvent.click(screen.getByRole('button', { name: 'Feroz' }));
    expect(button).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/nombre/i), 'Lucía');
    expect(button).toBeEnabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — discover button or name field not found

- [ ] **Step 3: Implement src/components/DiscovererForm.tsx**

```tsx
interface DiscovererFormProps {
  value: string;
  onChange: (value: string) => void;
}

export function DiscovererForm({ value, onChange }: DiscovererFormProps) {
  return (
    <div className="mb-6">
      <label htmlFor="discoverer-name" className="block text-lg font-bold mb-2 text-purple-700">
        Tu nombre de descubridor/a
      </label>
      <input
        id="discoverer-name"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escribe tu nombre"
        className="w-full max-w-sm px-4 py-2 rounded-lg border-2 border-purple-300 focus:outline-none focus:border-purple-600"
      />
    </div>
  );
}
```

- [ ] **Step 4: Implement src/components/DiscoverButton.tsx**

```tsx
interface DiscoverButtonProps {
  disabled: boolean;
  onClick: () => void;
}

export function DiscoverButton({ disabled, onClick }: DiscoverButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full max-w-sm px-6 py-3 rounded-full text-white font-bold text-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
    >
      ¡Descubrir mi dinosaurio!
    </button>
  );
}
```

- [ ] **Step 5: Implement src/App.tsx with selection state**

```tsx
import { useState } from 'react';
import { AttributeGroup } from './components/AttributeGroup';
import { DiscovererForm } from './components/DiscovererForm';
import { DiscoverButton } from './components/DiscoverButton';
import { SIZES, HABITATS, DIETS, FEATURES, PERSONALITIES } from './data/attributes';
import { isSelectionComplete } from './validation';
import type { Size, Habitat, Diet, Feature, Personality } from '../shared/types';

export default function App() {
  const [size, setSize] = useState<Size | null>(null);
  const [habitat, setHabitat] = useState<Habitat | null>(null);
  const [diet, setDiet] = useState<Diet | null>(null);
  const [feature, setFeature] = useState<Feature | null>(null);
  const [personality, setPersonality] = useState<Personality | null>(null);
  const [discovererName, setDiscovererName] = useState('');

  const canDiscover = isSelectionComplete(
    { size, habitat, diet, feature, personality },
    discovererName
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-100 to-blue-100 p-4">
      <h1 className="text-3xl font-bold text-center text-purple-700 mb-6">
        Generador de Descubrimiento de Dinosaurios
      </h1>
      <div className="max-w-2xl mx-auto">
        <AttributeGroup label="Tamaño" options={SIZES} selected={size} onSelect={setSize} />
        <AttributeGroup label="Hábitat" options={HABITATS} selected={habitat} onSelect={setHabitat} />
        <AttributeGroup label="Dieta" options={DIETS} selected={diet} onSelect={setDiet} />
        <AttributeGroup
          label="Característica especial"
          options={FEATURES}
          selected={feature}
          onSelect={setFeature}
        />
        <AttributeGroup
          label="Personalidad"
          options={PERSONALITIES}
          selected={personality}
          onSelect={setPersonality}
        />
        <DiscovererForm value={discovererName} onChange={setDiscovererName} />
        <DiscoverButton disabled={!canDiscover} onClick={() => {}} />
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/App.test.tsx`
Expected: `1 passed`

- [ ] **Step 7: Commit**

```bash
git add src/components/DiscovererForm.tsx src/components/DiscoverButton.tsx src/App.tsx src/App.test.tsx
git commit -m "Wire attribute selection state and discoverer name in App"
```

---

## Task 12: Frontend API client

**Files:**
- Create: `src/api.ts`
- Test: `src/api.test.ts`

**Interfaces:**
- Consumes: `GenerateDinoRequest`, `GenerateDinoResponse`, `ApiErrorResponse` from `shared/types`.
- Produces: `RateLimitError`, `DinoApiError` classes, `generateDino(req): Promise<GenerateDinoResponse>` — used by Task 16.

- [ ] **Step 1: Write the failing test**

```ts
// src/api.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateDino, RateLimitError, DinoApiError } from './api';
import type { GenerateDinoRequest } from '../shared/types';

const req: GenerateDinoRequest = {
  size: 'Gigante',
  habitat: 'Volcán',
  diet: 'Carnívoro',
  feature: 'Cuernos',
  personality: 'Feroz',
  discovererName: 'Lucía',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('generateDino', () => {
  it('returns the parsed response on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          scientificName: 'Volcanius ferox',
          commonName: 'Volcanrex',
          description: 'desc',
          imageUrl: '/images/abc.png',
        }),
      })
    );

    const result = await generateDino(req);
    expect(result.commonName).toBe('Volcanrex');
  });

  it('throws RateLimitError on a 429 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'RATE_LIMITED', retryAfterSeconds: 1200 }),
      })
    );

    await expect(generateDino(req)).rejects.toBeInstanceOf(RateLimitError);
  });

  it('throws DinoApiError on a 502 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'API_ERROR', message: 'No se pudo generar el dinosaurio' }),
      })
    );

    await expect(generateDino(req)).rejects.toBeInstanceOf(DinoApiError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/api.test.ts`
Expected: FAIL — `Cannot find module './api'`

- [ ] **Step 3: Implement src/api.ts**

```ts
import type { GenerateDinoRequest, GenerateDinoResponse, ApiErrorResponse } from '../shared/types';

export class RateLimitError extends Error {
  retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super('RATE_LIMITED');
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class DinoApiError extends Error {}

export async function generateDino(req: GenerateDinoRequest): Promise<GenerateDinoResponse> {
  const response = await fetch('/api/generate-dino', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (response.ok) {
    return (await response.json()) as GenerateDinoResponse;
  }

  const errorBody = (await response.json()) as ApiErrorResponse;
  if (errorBody.error === 'RATE_LIMITED') {
    throw new RateLimitError(errorBody.retryAfterSeconds ?? 3600);
  }
  throw new DinoApiError(errorBody.message ?? 'Error desconocido');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/api.test.ts`
Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add src/api.ts src/api.test.ts
git commit -m "Add frontend API client for /api/generate-dino"
```

---

## Task 13: LoadingDino and ResultScreen components

**Files:**
- Create: `src/components/LoadingDino.tsx`
- Create: `src/components/ResultScreen.tsx`
- Test: `src/components/ResultScreen.test.tsx`

**Interfaces:**
- Consumes: `GenerateDinoResponse` from `shared/types`.
- Produces: `LoadingDino()` (no props), `ResultScreen({ result, onDownloadClick })` — used by Task 16.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/ResultScreen.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResultScreen } from './ResultScreen';
import type { GenerateDinoResponse } from '../../shared/types';

const result: GenerateDinoResponse = {
  scientificName: 'Volcanius ferox',
  commonName: 'Volcanrex',
  description: 'Un dinosaurio feroz que vive en volcanes.',
  imageUrl: '/images/abc.png',
};

describe('ResultScreen', () => {
  it('shows the dino name, description and image', () => {
    render(<ResultScreen result={result} onDownloadClick={() => {}} />);
    expect(screen.getByText('Volcanrex')).toBeInTheDocument();
    expect(screen.getByText('Volcanius ferox')).toBeInTheDocument();
    expect(screen.getByText(result.description)).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/images/abc.png');
  });

  it('calls onDownloadClick when the download button is clicked', async () => {
    const onDownloadClick = vi.fn();
    render(<ResultScreen result={result} onDownloadClick={onDownloadClick} />);
    await userEvent.click(screen.getByRole('button', { name: /descargar certificado/i }));
    expect(onDownloadClick).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ResultScreen.test.tsx`
Expected: FAIL — `Cannot find module './ResultScreen'`

- [ ] **Step 3: Implement src/components/LoadingDino.tsx**

```tsx
export function LoadingDino() {
  return (
    <div className="flex flex-col items-center justify-center py-12" role="status">
      <div className="text-6xl animate-bounce">🦖</div>
      <p className="mt-4 text-lg font-bold text-purple-700">
        ¡Excavando tu dinosaurio único!
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Implement src/components/ResultScreen.tsx**

```tsx
import type { GenerateDinoResponse } from '../../shared/types';

interface ResultScreenProps {
  result: GenerateDinoResponse;
  onDownloadClick: () => void;
}

export function ResultScreen({ result, onDownloadClick }: ResultScreenProps) {
  return (
    <div className="max-w-xl mx-auto text-center">
      <img
        src={result.imageUrl}
        alt={result.commonName}
        className="w-64 h-64 object-contain mx-auto rounded-xl bg-white shadow-md"
      />
      <h2 className="text-2xl font-bold text-purple-700 mt-4">{result.commonName}</h2>
      <p className="italic text-gray-600">{result.scientificName}</p>
      <p className="mt-3 text-gray-800">{result.description}</p>
      <button
        type="button"
        onClick={onDownloadClick}
        className="mt-6 px-6 py-3 rounded-full text-white font-bold bg-orange-500 hover:bg-orange-600"
      >
        Descargar certificado
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/ResultScreen.test.tsx`
Expected: `2 passed`

- [ ] **Step 6: Commit**

```bash
git add src/components/LoadingDino.tsx src/components/ResultScreen.tsx src/components/ResultScreen.test.tsx
git commit -m "Add LoadingDino animation and ResultScreen components"
```

---

## Task 14: Email store and EmailGateModal

**Files:**
- Create: `src/emailStore.ts`
- Create: `src/components/EmailGateModal.tsx`
- Test: `src/emailStore.test.ts`
- Test: `src/components/EmailGateModal.test.tsx`

**Interfaces:**
- Consumes: nothing from prior tasks.
- Produces: `isValidEmail(email): boolean`, `saveEmail(email): void`; `EmailGateModal({ onConfirm, onCancel })` — used by Task 16.

- [ ] **Step 1: Write the failing test for emailStore**

```ts
// src/emailStore.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/emailStore.test.ts`
Expected: FAIL — `Cannot find module './emailStore'`

- [ ] **Step 3: Implement src/emailStore.ts**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/emailStore.test.ts`
Expected: `4 passed`

- [ ] **Step 5: Write the failing test for EmailGateModal**

```tsx
// src/components/EmailGateModal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmailGateModal } from './EmailGateModal';

describe('EmailGateModal', () => {
  it('shows an inline error for an invalid email and does not call onConfirm', async () => {
    const onConfirm = vi.fn();
    render(<EmailGateModal onConfirm={onConfirm} onCancel={() => {}} />);
    await userEvent.type(screen.getByLabelText(/email/i), 'not-an-email');
    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }));
    expect(screen.getByText(/correo válido/i)).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm with the email when valid', async () => {
    const onConfirm = vi.fn();
    render(<EmailGateModal onConfirm={onConfirm} onCancel={() => {}} />);
    await userEvent.type(screen.getByLabelText(/email/i), 'nina@example.com');
    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }));
    expect(onConfirm).toHaveBeenCalledWith('nina@example.com');
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/components/EmailGateModal.test.tsx`
Expected: FAIL — `Cannot find module './EmailGateModal'`

- [ ] **Step 7: Implement src/components/EmailGateModal.tsx**

```tsx
import { useState } from 'react';
import { isValidEmail } from '../emailStore';

interface EmailGateModalProps {
  onConfirm: (email: string) => void;
  onCancel: () => void;
}

export function EmailGateModal({ onConfirm, onCancel }: EmailGateModalProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  function handleConfirm() {
    if (!isValidEmail(email)) {
      setError('Por favor, escribe un correo válido.');
      return;
    }
    setError('');
    onConfirm(email);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full">
        <h3 className="text-xl font-bold text-purple-700 mb-2">¡Casi listo!</h3>
        <p className="text-gray-700 mb-4">
          Escribe tu email para descargar el certificado de descubrimiento.
        </p>
        <label htmlFor="gate-email" className="block font-semibold mb-1">
          Email
        </label>
        <input
          id="gate-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border-2 border-purple-300 focus:outline-none focus:border-purple-600"
        />
        {error && <p className="text-red-600 mt-1 text-sm">{error}</p>}
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-full border-2 border-gray-300 font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 rounded-full bg-purple-600 text-white font-semibold"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/components/EmailGateModal.test.tsx`
Expected: `2 passed`

- [ ] **Step 9: Commit**

```bash
git add src/emailStore.ts src/emailStore.test.ts src/components/EmailGateModal.tsx src/components/EmailGateModal.test.tsx
git commit -m "Add email gate modal and localStorage email persistence"
```

---

## Task 15: Certificate component and PNG download

**Files:**
- Create: `src/certificate.ts`
- Create: `src/components/Certificate.tsx`
- Test: `src/certificate.test.ts`

**Interfaces:**
- Consumes: `GenerateDinoResponse` from `shared/types`, `html2canvas`.
- Produces: `captureCertificateAsPng(element, fileName): Promise<void>`; `Certificate({ discovererName, result })` (forwardRef to its root element) — used by Task 16.

- [ ] **Step 1: Write the failing test for captureCertificateAsPng**

```ts
// src/certificate.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('html2canvas', () => ({
  default: vi.fn(),
}));

import html2canvas from 'html2canvas';
import { captureCertificateAsPng } from './certificate';

describe('captureCertificateAsPng', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:fake'), revokeObjectURL: vi.fn() });
  });

  it('renders the element to canvas and triggers a download', async () => {
    const fakeBlob = new Blob(['fake'], { type: 'image/png' });
    const fakeCanvas = {
      toBlob: (cb: (blob: Blob | null) => void) => cb(fakeBlob),
    } as unknown as HTMLCanvasElement;
    vi.mocked(html2canvas).mockResolvedValue(fakeCanvas);

    const element = document.createElement('div');
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') el.click = clickSpy;
      return el;
    });

    await captureCertificateAsPng(element, 'certificado-volcanrex.png');

    expect(html2canvas).toHaveBeenCalledWith(element, { scale: 2 });
    expect(clickSpy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/certificate.test.ts`
Expected: FAIL — `Cannot find module './certificate'`

- [ ] **Step 3: Implement src/certificate.ts**

```ts
import html2canvas from 'html2canvas';

export async function captureCertificateAsPng(element: HTMLElement, fileName: string): Promise<void> {
  const canvas = await html2canvas(element, { scale: 2 });
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    throw new Error('No se pudo generar la imagen del certificado');
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/certificate.test.ts`
Expected: `1 passed`

- [ ] **Step 5: Implement src/components/Certificate.tsx**

```tsx
import { forwardRef } from 'react';
import type { GenerateDinoResponse } from '../../shared/types';

interface CertificateProps {
  discovererName: string;
  result: GenerateDinoResponse;
}

export const Certificate = forwardRef<HTMLDivElement, CertificateProps>(
  ({ discovererName, result }, ref) => {
    const discoveryDate = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return (
      <div
        ref={ref}
        className="w-[800px] p-10 bg-white border-8 border-yellow-500 text-center"
      >
        <div className="text-5xl mb-2">🏆</div>
        <h2 className="text-3xl font-bold text-purple-700">Certificado Oficial de Descubrimiento</h2>
        <p className="mt-4 text-xl">
          Descubridor/a Oficial: <strong>{discovererName}</strong>
        </p>
        <img
          src={result.imageUrl}
          alt={result.commonName}
          className="w-48 h-48 object-contain mx-auto my-4"
        />
        <p className="text-2xl font-bold text-purple-700">{result.commonName}</p>
        <p className="italic text-gray-600">{result.scientificName}</p>
        <p className="mt-4 text-gray-700">Fecha de descubrimiento: {discoveryDate}</p>
      </div>
    );
  }
);
Certificate.displayName = 'Certificate';
```

- [ ] **Step 6: Commit**

```bash
git add src/certificate.ts src/certificate.test.ts src/components/Certificate.tsx
git commit -m "Add certificate PNG capture and Certificate component"
```

---

## Task 16: Full App flow wiring

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `generateDino`/`RateLimitError`/`DinoApiError` (Task 12), `LoadingDino`/`ResultScreen` (Task 13), `EmailGateModal` (Task 14), `captureCertificateAsPng`/`Certificate` (Task 15), selection state from Task 11.
- Produces: complete user-facing flow — no further tasks consume this.

- [ ] **Step 1: Replace src/App.tsx with the full flow**

```tsx
import { useRef, useState } from 'react';
import { AttributeGroup } from './components/AttributeGroup';
import { DiscovererForm } from './components/DiscovererForm';
import { DiscoverButton } from './components/DiscoverButton';
import { LoadingDino } from './components/LoadingDino';
import { ResultScreen } from './components/ResultScreen';
import { EmailGateModal } from './components/EmailGateModal';
import { Certificate } from './components/Certificate';
import { SIZES, HABITATS, DIETS, FEATURES, PERSONALITIES } from './data/attributes';
import { isSelectionComplete } from './validation';
import { generateDino, RateLimitError, DinoApiError } from './api';
import { saveEmail } from './emailStore';
import { captureCertificateAsPng } from './certificate';
import type {
  Size,
  Habitat,
  Diet,
  Feature,
  Personality,
  GenerateDinoResponse,
} from '../shared/types';

type FlowState = 'idle' | 'loading' | 'result' | 'error';

export default function App() {
  const [size, setSize] = useState<Size | null>(null);
  const [habitat, setHabitat] = useState<Habitat | null>(null);
  const [diet, setDiet] = useState<Diet | null>(null);
  const [feature, setFeature] = useState<Feature | null>(null);
  const [personality, setPersonality] = useState<Personality | null>(null);
  const [discovererName, setDiscovererName] = useState('');

  const [flowState, setFlowState] = useState<FlowState>('idle');
  const [result, setResult] = useState<GenerateDinoResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showEmailGate, setShowEmailGate] = useState(false);

  const certificateRef = useRef<HTMLDivElement>(null);

  const partial = { size, habitat, diet, feature, personality };
  const canDiscover = isSelectionComplete(partial, discovererName);

  async function handleDiscover() {
    if (!isSelectionComplete(partial, discovererName)) return;
    setFlowState('loading');
    try {
      const response = await generateDino({ ...partial, discovererName });
      setResult(response);
      setFlowState('result');
    } catch (err) {
      if (err instanceof RateLimitError) {
        const minutes = Math.ceil(err.retryAfterSeconds / 60);
        setErrorMessage(`¡Has descubierto muchos dinosaurios hoy! Vuelve en unos ${minutes} minutos.`);
      } else if (err instanceof DinoApiError) {
        setErrorMessage('¡El dinosaurio se escapó! Inténtalo de nuevo.');
      } else {
        setErrorMessage('Algo salió mal. Inténtalo de nuevo.');
      }
      setFlowState('error');
    }
  }

  async function handleEmailConfirm(email: string) {
    saveEmail(email);
    setShowEmailGate(false);
    if (certificateRef.current && result) {
      await captureCertificateAsPng(
        certificateRef.current,
        `certificado-${result.commonName.toLowerCase().replace(/\s+/g, '-')}.png`
      );
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-100 to-blue-100 p-4">
      <h1 className="text-3xl font-bold text-center text-purple-700 mb-6">
        Generador de Descubrimiento de Dinosaurios
      </h1>

      {flowState === 'idle' && (
        <div className="max-w-2xl mx-auto">
          <AttributeGroup label="Tamaño" options={SIZES} selected={size} onSelect={setSize} />
          <AttributeGroup label="Hábitat" options={HABITATS} selected={habitat} onSelect={setHabitat} />
          <AttributeGroup label="Dieta" options={DIETS} selected={diet} onSelect={setDiet} />
          <AttributeGroup
            label="Característica especial"
            options={FEATURES}
            selected={feature}
            onSelect={setFeature}
          />
          <AttributeGroup
            label="Personalidad"
            options={PERSONALITIES}
            selected={personality}
            onSelect={setPersonality}
          />
          <DiscovererForm value={discovererName} onChange={setDiscovererName} />
          <DiscoverButton disabled={!canDiscover} onClick={handleDiscover} />
        </div>
      )}

      {flowState === 'loading' && <LoadingDino />}

      {flowState === 'error' && (
        <div className="max-w-md mx-auto text-center">
          <p className="text-red-700 font-semibold mb-4">{errorMessage}</p>
          <button
            type="button"
            onClick={() => setFlowState('idle')}
            className="px-6 py-3 rounded-full bg-purple-600 text-white font-bold"
          >
            Volver a intentar
          </button>
        </div>
      )}

      {flowState === 'result' && result && (
        <>
          <ResultScreen result={result} onDownloadClick={() => setShowEmailGate(true)} />
          <div className="fixed -left-[9999px] top-0" aria-hidden="true">
            <Certificate ref={certificateRef} discovererName={discovererName} result={result} />
          </div>
        </>
      )}

      {showEmailGate && (
        <EmailGateModal onConfirm={handleEmailConfirm} onCancel={() => setShowEmailGate(false)} />
      )}
    </main>
  );
}
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: all tests pass (the Task 11 `App.test.tsx` selection test still passes since the `idle` state UI is unchanged).

- [ ] **Step 3: Manually verify the flow in the browser**

Run: `npm run dev`, open the printed local URL, select all 5 attributes, type a name, click "¡Descubrir mi dinosaurio!". Since no real API keys are configured yet (Task 17 adds them), expect the friendly error screen to appear — confirm the "Volver a intentar" button resets to the selection screen.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "Wire full discover -> loading -> result/error -> email gate -> download flow"
```

---

## Task 17: Cloudflare deployment configuration

**Files:**
- Modify: `wrangler.jsonc`
- Modify: `README.md`

**Interfaces:**
- Consumes: bindings referenced in Task 8 (`RATE_LIMIT_KV`, `CACHE_KV`, `DINO_IMAGES`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`).
- Produces: a deployable Cloudflare Pages project.

- [ ] **Step 1: Create the real KV namespaces**

```bash
npx wrangler kv namespace create RATE_LIMIT_KV
npx wrangler kv namespace create CACHE_KV
```

Copy the `id` printed for each namespace.

- [ ] **Step 2: Create the R2 bucket**

```bash
npx wrangler r2 bucket create dino-discovery-images
```

- [ ] **Step 3: Update wrangler.jsonc with the real IDs**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "dino-discovery-generator",
  "pages_build_output_dir": "dist",
  "compatibility_date": "2026-06-28",
  "compatibility_flags": ["nodejs_compat"],
  "kv_namespaces": [
    { "binding": "RATE_LIMIT_KV", "id": "<id-printed-for-RATE_LIMIT_KV>" },
    { "binding": "CACHE_KV", "id": "<id-printed-for-CACHE_KV>" }
  ],
  "r2_buckets": [
    { "binding": "DINO_IMAGES", "bucket_name": "dino-discovery-images" }
  ]
}
```

- [ ] **Step 4: Set production secrets**

```bash
npx wrangler pages secret put ANTHROPIC_API_KEY --project-name dino-discovery-generator
npx wrangler pages secret put OPENAI_API_KEY --project-name dino-discovery-generator
```

- [ ] **Step 5: Copy .dev.vars.example to .dev.vars for local development**

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` and fill in real `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` values for local testing (this file is gitignored).

- [ ] **Step 6: Run the project locally with Pages Functions enabled**

Run: `npx wrangler pages dev -- npm run dev`
Expected: the Vite dev server starts and Pages Functions in `functions/` are available at `/api/generate-dino` and `/images/:key`.

- [ ] **Step 7: Manually verify a real end-to-end generation**

In the browser, select all 5 attributes, enter a name, click "¡Descubrir mi dinosaurio!". Expect: loading animation, then a result screen with a real dinosaur image, scientific name, common name and description. Click "Descargar certificado", enter an email, confirm, and verify a PNG file downloads.

- [ ] **Step 8: Document deployment in README.md**

```markdown
## Despliegue

1. `npm install`
2. `npx wrangler kv namespace create RATE_LIMIT_KV` y `CACHE_KV`, copiar los IDs a `wrangler.jsonc`
3. `npx wrangler r2 bucket create dino-discovery-images`
4. `npx wrangler pages secret put ANTHROPIC_API_KEY --project-name dino-discovery-generator`
5. `npx wrangler pages secret put OPENAI_API_KEY --project-name dino-discovery-generator`
6. `npm run build`
7. `npx wrangler pages deploy dist --project-name dino-discovery-generator`

## Desarrollo local

1. Copiar `.dev.vars.example` a `.dev.vars` y rellenar las claves reales
2. `npx wrangler pages dev -- npm run dev`
```

- [ ] **Step 9: Commit**

```bash
git add wrangler.jsonc README.md
git commit -m "Add Cloudflare Pages deployment configuration and docs"
```

