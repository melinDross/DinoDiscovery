# Dino Image Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain white background in generated dino images with a solid color matching the app's theme, and invalidate the existing cache so already-generated attribute combinations pick up the new look.

**Architecture:** A one-line prompt change in `functions/lib/openai.ts` (swap "white background" for a solid hex color), paired with a cache-key version bump in `functions/lib/hash.ts` so the change actually reaches users instead of being masked by stale cached entries.

**Tech Stack:** Cloudflare Pages Functions (TypeScript), Vitest.

## Global Constraints

- Background color is a fixed solid hex value, `#0d1a0f` (the app's `bg` Tailwind token) — not transparency, not a per-habitat scene.
- "Volcán" is left untouched — no special-casing added or removed for it.
- No changes to `functions/lib/anthropic.ts`, `src/components/ResultScreen.tsx`, or `src/components/Certificate.tsx`.
- Cache invalidation is logical only (version bump in the hashed key) — no manual KV purge.

---

### Task 1: Change the image generation prompt's background instruction

**Files:**
- Modify: `functions/lib/openai.ts:8`
- Test: `functions/lib/openai.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing consumed by Task 2 (independent change).

- [ ] **Step 1: Write the failing test**

Add this test to `functions/lib/openai.test.ts`, inside the existing `describe('generateDinoImage', ...)` block (after the existing three tests):

```ts
  it('requests a solid app-colored background instead of white', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ b64_json: 'ZmFrZS1pbWFnZS1ieXRlcw==' }] }),
    });

    await generateDinoImage(attrs, 'fake-key', fakeFetch as unknown as typeof fetch);

    const [, requestInit] = fakeFetch.mock.calls[0];
    const body = JSON.parse(requestInit.body as string);
    expect(body.prompt).toContain('solid background color #0d1a0f');
    expect(body.prompt).not.toContain('white background');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run functions/lib/openai.test.ts`
Expected: FAIL — current prompt contains `white background`, not `solid background color #0d1a0f`.

- [ ] **Step 3: Update the prompt in `functions/lib/openai.ts`**

Replace line 8:

```ts
  const prompt = `A friendly cartoon dinosaur for a children's app, ${attrs.size} size, living in ${attrs.habitat}, ${attrs.diet} diet, with ${attrs.feature}, ${attrs.personality} personality. Colorful, simple, no text, no watermark, solid background color #0d1a0f.`;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run functions/lib/openai.test.ts`
Expected: PASS (4 tests: the 3 pre-existing ones plus the new one).

- [ ] **Step 5: Commit**

```bash
git add functions/lib/openai.ts functions/lib/openai.test.ts
git commit -m "Generate dino images with a solid app-colored background instead of white"
```

---

### Task 2: Bump the cache key version to invalidate stale white-background entries

**Files:**
- Modify: `functions/lib/hash.ts:4-10`
- Test: `functions/lib/hash.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 (independent change, but logically motivated by it).
- Produces: nothing consumed elsewhere — `computeCacheKey`'s exported signature (`(attrs: DinoAttributes) => Promise<string>`) is unchanged, only its internal output values change.

- [ ] **Step 1: Write the failing test**

Add this test to `functions/lib/hash.test.ts`, inside the existing `describe('computeCacheKey', ...)` block:

```ts
  it('includes a version marker so prompt/format changes can invalidate old cache entries', async () => {
    const key = await computeCacheKey(baseAttrs);
    // Recompute what the un-versioned key would have been, to prove the
    // versioned key differs from it (i.e. the version string actually
    // participates in the hash input, not just appended after hashing).
    const unversionedCanonical = [
      baseAttrs.size,
      baseAttrs.habitat,
      baseAttrs.diet,
      baseAttrs.feature,
      baseAttrs.personality,
    ].join('|');
    const data = new TextEncoder().encode(unversionedCanonical);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const unversionedKey = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    expect(key).not.toBe(unversionedKey);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run functions/lib/hash.test.ts`
Expected: FAIL — `computeCacheKey` currently produces the same hash as the manually-computed unversioned one.

- [ ] **Step 3: Add the version marker in `functions/lib/hash.ts`**

Replace the `canonical` array (lines 4-10):

```ts
  const canonical = [
    attrs.size,
    attrs.habitat,
    attrs.diet,
    attrs.feature,
    attrs.personality,
    'v2',
  ].join('|');
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run functions/lib/hash.test.ts`
Expected: PASS (4 tests: the 3 pre-existing ones plus the new one).

- [ ] **Step 5: Commit**

```bash
git add functions/lib/hash.ts functions/lib/hash.test.ts
git commit -m "Bump dino cache key version to invalidate white-background cache entries"
```

---

### Task 3: Full verification and future-features.md update

**Files:**
- Modify: `docs/future-features.md` (mark point 16 as delivered)

**Interfaces:**
- Consumes: both prior tasks' changes (this task only verifies + documents, no new production code).

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS, all test files green (no regressions — this touches backend-only files, frontend test count should be unchanged from before this plan).

- [ ] **Step 2: Run the build**

Run: `npm run build`
Expected: succeeds (typecheck + Vite build), no TypeScript errors.

- [ ] **Step 3: Mark point 16 as done in `docs/future-features.md`**

Find this line:

```
16. **Quitar el fondo blanco de las imágenes generadas** — actualmente todos los dinosaurios se generan sobre un fondo blanco liso. Probar fondo transparente, o un fondo que se mimetice con la paleta oscura/lima de la app, para que el resultado se sienta más integrado visualmente con el resto de la experiencia (requiere ajustar el prompt de generación de imagen).
```

Replace it with:

```
16. ✅ **Quitar el fondo blanco de las imágenes generadas** — implementado: el prompt de `gpt-image-2` ahora pide un fondo sólido `#0d1a0f` (verde oscuro de la app) en vez de blanco. No es transparencia real (gpt-image-2 no la soporta) ni una escena contextual (eso queda como punto 17, sin implementar).
```

Also update the notes section. Find:

```
- Los puntos 16 y 17 son ambos ajustes del prompt de generación de imagen — tiene sentido abordarlos juntos en la misma iteración.
```

Replace it with:

```
- El punto 17 sigue pendiente y ahora está desacoplado del 16: una escena contextual por hábitat necesita su propio fondo, incompatible con el fondo sólido fijo que implementa el punto 16.
```

- [ ] **Step 4: Commit**

```bash
git add docs/future-features.md
git commit -m "Mark future-features point 16 as delivered, decouple it from point 17"
```
