# ARG Card Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn DinoDiscovery's "certificate of discovery" into a collectible, ARG-styled trading card with a deterministic species ID, rarity tier, and 3D flip/tilt interaction, while reframing the whole UI's copy around "detecting" species instead of "generating" them.

**Architecture:** Add a pure rarity/ID utility (`speciesHash.ts`), a card theme data module (habitat colors, region names, rarity labels), a flat `Card` component (used both visibly and as a hidden html2canvas capture target — mirroring the existing `Certificate` pattern), and a `CardScene` wrapper that adds the 3D flip/tilt/spin/glow behavior purely in CSS+JS without new libraries. Backend gets a small, additive change: the existing `attrs` already stored per result is now also returned by `/api/results/:id` so shared links can render the same card.

**Tech Stack:** React 19, TypeScript (strict, no `any`), Tailwind, html2canvas (already installed), Vitest + Testing Library.

## Global Constraints

- No `any` types anywhere; strict TypeScript.
- Tailwind for all styling, consistent with existing color tokens (`bg`, `surface1`, `surface2`, `accent`, `cream`, `sage`, `moss`) — note `rounded-full`/`rounded-*` are overridden to `4px` in `tailwind.config.js`, so true pill shapes must use arbitrary values like `rounded-[40px]`.
- Do not change AI text/image generation logic (`functions/lib/anthropic.ts`, `functions/lib/openai.ts`) or the email-gate flow logic (`EmailGateModal` confirm/cancel behavior, `subscribeEmail` call order in `App.tsx`).
- Do not install new dependencies (`html2canvas` is already in `package.json`).
- Commit after each task with a descriptive message.
- Habitat header colors (exact, from spec + user decision): Volcán `#2d6a9f`, Ártico `#2a6a9a`, Selva `#2a7a4f`, Océano `#1a5a8f`, Desierto `#8a5a1a`, Montaña `#6b5b4a`.
- Size option `'Gigante'` is kept as-is (not renamed to `'Gigantesco'`) to avoid breaking ~15 existing test fixtures that hard-code `'Gigante'`; it absorbs the point value the rarity doc assigns to `'Gigantesco'`. This is documented inline in `speciesHash.ts`.

---

## File Structure

| File | Responsibility |
|---|---|
| `shared/types.ts` (modify) | Widen `Size`/`Diet`/`Habitat` unions to match `docs/RARITY_SYSTEM.md`; add `attrs` to `FetchedResult`-equivalent shape used by the API. |
| `src/data/attributes.ts` (modify) | Add new option values; move `OPTION_EMOJIS` here as `ATTRIBUTE_EMOJIS` (shared by `AttributeGroup` and `Card`) and extend it. |
| `src/components/AttributeGroup.tsx` (modify) | Import `ATTRIBUTE_EMOJIS` instead of a local map; add optional `description` line under the label. |
| `src/utils/speciesHash.ts` (create) | `generateSpeciesId` + `calculateRarity`, pure functions, no React. |
| `src/utils/speciesHash.test.ts` (create) | Unit tests for both functions. |
| `src/data/cardTheme.ts` (create) | Habitat header colors, fictional region names + emoji, rarity labels/badge colors, expedition name/number helper. |
| `src/components/Card.tsx` (create, replaces `Certificate.tsx`) | Flat, non-interactive card layout per Task 3 spec. `forwardRef<HTMLDivElement>`. |
| `src/components/Card.test.tsx` (create, replaces `Certificate.test.tsx`) | Render assertions for the new layout. |
| `src/components/Certificate.tsx` / `.test.tsx` (delete) | Superseded by `Card.tsx`. |
| `src/components/CardScene.tsx` (create) | 3D flip-in + mouse tilt + spin button + legendary glow, wraps a visible `Card`. |
| `src/components/CardScene.test.tsx` (create) | Tests for tilt math, spin trigger, glow class gating. |
| `src/components/ResultScreen.tsx` (modify) | Show `CardScene`+`Card` instead of the bare image block; show species ID; rename download button copy. |
| `src/components/ResultScreen.test.tsx` (modify) | Update assertions for new copy/markup. |
| `src/components/Landing.tsx` / `.test.tsx` (modify) | ARG subtitle copy. |
| `src/components/LoadingDino.tsx` / `.test.tsx` (modify) | Replace captions with the ARG sequence. |
| `src/components/EmailGateModal.tsx` / `.test.tsx` (modify) | "certificado" → "carta" copy only. |
| `src/App.tsx` (modify) | Track submitted/fetched `attrs`; pass to `Card`/`ResultScreen`; rename "Crear otro dinosaurio" button; hidden capture node uses `Card`. |
| `src/App.test.tsx` (modify) | Update copy assertions; assert `attrs` flow through. |
| `src/api.ts` (modify) | `FetchedResult` gains `attrs: DinoAttributes`. |
| `functions/api/results/[id].ts` (modify) | Return `attrs` in the JSON response. |
| `functions/api/results/[id].test.ts` (modify) | Assert `attrs` in response. |
| `functions/api/generate-dino.ts` (modify) | Widen `VALID_SIZES`/`VALID_HABITATS`/`VALID_DIETS` to the new option lists. |
| `functions/api/generate-dino.test.ts` (modify) | Add a case covering a new attribute value. |

---

### Task 1: Expand attribute options + rarity/species-ID utility

**Files:**
- Modify: `shared/types.ts`
- Modify: `src/data/attributes.ts`
- Modify: `functions/api/generate-dino.ts:21-23`
- Modify: `functions/api/generate-dino.test.ts`
- Create: `src/utils/speciesHash.ts`
- Create: `src/utils/speciesHash.test.ts`
- Test: `src/utils/speciesHash.test.ts`

**Interfaces:**
- Produces: `generateSpeciesId(attributes: Record<string, string>): string` → `"DX-XXX-XXX"`.
- Produces: `calculateRarity(attrs: { size: string; diet: string; feature: string; personality: string; habitat: string }): 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'`.
- Produces (types): `Size`, `Habitat`, `Diet` widened unions consumed by `Card`, `cardTheme.ts`, `AttributeGroup`, and the wizard.

- [ ] **Step 1: Widen the attribute unions**

Edit `shared/types.ts`:

```ts
export type Size = 'Diminuto' | 'Pequeño' | 'Mediano' | 'Grande' | 'Gigante' | 'Coloso';
export type Habitat = 'Selva' | 'Desierto' | 'Océano' | 'Montaña' | 'Volcán' | 'Ártico';
export type Diet = 'Carnívoro' | 'Herbívoro' | 'Omnívoro' | 'Oófago';
```

(`Feature` and `Personality` are unchanged — they already match `docs/RARITY_SYSTEM.md`'s 6 and 4 options respectively, once `'Escamas coloridas'`/`'Súper garras'` are treated as the doc's `'Escamas'`/`'Super garras'`.)

- [ ] **Step 2: Update the wizard's option lists**

Edit `src/data/attributes.ts`:

```ts
import type { Size, Habitat, Diet, Feature, Personality } from '../../shared/types';

export const SIZES: Size[] = ['Diminuto', 'Pequeño', 'Mediano', 'Grande', 'Gigante', 'Coloso'];
export const HABITATS: Habitat[] = ['Selva', 'Desierto', 'Océano', 'Montaña', 'Volcán', 'Ártico'];
export const DIETS: Diet[] = ['Carnívoro', 'Herbívoro', 'Omnívoro', 'Oófago'];
export const FEATURES: Feature[] = [
  'Cuernos',
  'Alas',
  'Escamas coloridas',
  'Cola poderosa',
  'Armadura',
  'Súper garras',
];
export const PERSONALITIES: Personality[] = ['Feroz', 'Amigable', 'Veloz', 'Sigiloso'];

export const ATTRIBUTE_EMOJIS: Record<string, string> = {
  Diminuto: '🐜',
  Pequeño: '🐭',
  Mediano: '🦎',
  Grande: '🦏',
  Gigante: '🦕',
  Coloso: '🦣',
  Selva: '🌴',
  Desierto: '🏜️',
  Océano: '🌊',
  Montaña: '🏔️',
  Volcán: '🌋',
  Ártico: '🧊',
  Carnívoro: '🥩',
  Herbívoro: '🌿',
  Omnívoro: '🍖',
  Oófago: '🥚',
  Cuernos: '🦄',
  Alas: '🦅',
  'Escamas coloridas': '✨',
  'Cola poderosa': '💥',
  Armadura: '🛡️',
  'Súper garras': '⚡',
  Feroz: '😤',
  Amigable: '😊',
  Veloz: '⚡',
  Sigiloso: '🥷',
};
```

- [ ] **Step 3: Update `AttributeGroup` to use the shared emoji map**

In `src/components/AttributeGroup.tsx`, delete the local `OPTION_EMOJIS` constant (lines 3-25) and replace with:

```ts
import { ATTRIBUTE_EMOJIS } from '../data/attributes';
```

and change line 63 from `{OPTION_EMOJIS[option] ?? ''}` to `{ATTRIBUTE_EMOJIS[option] ?? ''}`.

Also add an optional `description` prop rendered between the label and the options grid (used in Task 2 for the ARG scanner copy):

```ts
interface AttributeGroupProps<T extends string> {
  label: string;
  description?: string;
  options: T[];
  selected: T | null;
  onSelect: (value: T) => void;
}

export function AttributeGroup<T extends string>({
  label,
  description,
  options,
  selected,
  onSelect,
}: AttributeGroupProps<T>) {
  return (
    <div className="mb-6">
      <h3 className="font-display text-2xl sm:text-3xl text-cream mb-3 sm:mb-4 uppercase tracking-wide text-center">
        {label}
      </h3>
      {description && (
        <p className="text-sage text-sm text-center mb-3 sm:mb-4 italic">{description}</p>
      )}
      <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
```

(rest of the function body unchanged)

- [ ] **Step 4: Widen the backend's validation lists**

Edit `functions/api/generate-dino.ts:21-23`:

```ts
const VALID_SIZES = ['Diminuto', 'Pequeño', 'Mediano', 'Grande', 'Gigante', 'Coloso'];
const VALID_HABITATS = ['Selva', 'Desierto', 'Océano', 'Montaña', 'Volcán', 'Ártico'];
const VALID_DIETS = ['Carnívoro', 'Herbívoro', 'Omnívoro', 'Oófago'];
```

- [ ] **Step 5: Add a backend test for a new attribute value**

In `functions/api/generate-dino.test.ts`, find the `validBody` constant (around line 42) and, after the existing happy-path test that uses it, add:

```ts
it('accepts the expanded attribute options (Coloso, Oófago, Ártico)', async () => {
  vi.mocked(generateDinoText).mockResolvedValue({
    scientificName: 'Glacius vorax',
    commonName: 'Glaciodonte',
    description: 'Un gigante helado.',
  });
  vi.mocked(generateDinoImage).mockResolvedValue('base64image');
  vi.mocked(storeImageInR2).mockResolvedValue(undefined);

  const env = createEnv();
  const body = { ...validBody, size: 'Coloso', diet: 'Oófago', habitat: 'Ártico' };
  const response = await onRequestPost({ request: createRequest(body), env });

  expect(response.status).toBe(200);
});
```

(Place it in the same `describe` block as the other `onRequestPost` tests, reusing whatever imports/helpers — `createEnv`, `createRequest` — already exist in the file above line 60.)

- [ ] **Step 6: Run the backend test**

Run: `npm test -- functions/api/generate-dino.test.ts`
Expected: PASS, including the new test.

- [ ] **Step 7: Write `speciesHash.ts`**

Create `src/utils/speciesHash.ts`:

```ts
export function generateSpeciesId(attributes: Record<string, string>): string {
  const sorted = Object.keys(attributes)
    .sort()
    .map((k) => attributes[k])
    .join('|');
  let h = 5381;
  for (let i = 0; i < sorted.length; i++) {
    h = (h << 5) + h + sorted.charCodeAt(i);
    h = h & h;
  }
  const base = Math.abs(h).toString(36).toUpperCase().padStart(6, '0');
  return `DX-${base.slice(0, 3)}-${base.slice(3, 6)}`;
}

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface RarityAttributes {
  size: string;
  diet: string;
  feature: string;
  personality: string;
  habitat: string;
}

// Point tables from docs/RARITY_SYSTEM.md. 'Gigante' carries the points the
// doc assigns to 'Gigantesco' (same size tier, kept under the project's
// existing label to avoid renaming an attribute users already see/share).
const SIZE_POINTS: Record<string, number> = {
  Mediano: 1,
  Pequeño: 2,
  Grande: 2,
  Diminuto: 3,
  Gigante: 3,
  Coloso: 4,
};

const DIET_POINTS: Record<string, number> = {
  Herbívoro: 1,
  Omnívoro: 2,
  Carnívoro: 2,
  Oófago: 4,
};

const FEATURE_POINTS: Record<string, number> = {
  'Escamas coloridas': 1,
  'Cola poderosa': 2,
  Cuernos: 2,
  Armadura: 3,
  'Súper garras': 3,
  Alas: 4,
};

const PERSONALITY_POINTS: Record<string, number> = {
  Amigable: 1,
  Veloz: 2,
  Feroz: 2,
  Sigiloso: 3,
};

const HABITAT_POINTS: Record<string, number> = {
  Selva: 1,
  Desierto: 2,
  Océano: 2,
  Montaña: 2,
  Volcán: 3,
  Ártico: 3,
};

const SPECIAL_MULTIPLIERS: Array<{
  match: Partial<RarityAttributes>;
  multiplier: number;
}> = [
  { match: { size: 'Coloso', diet: 'Oófago', feature: 'Alas' }, multiplier: 1.5 },
  { match: { size: 'Diminuto', personality: 'Sigiloso', habitat: 'Volcán' }, multiplier: 1.3 },
  { match: { personality: 'Amigable', feature: 'Armadura', habitat: 'Ártico' }, multiplier: 1.2 },
];

function getMultiplier(attrs: RarityAttributes): number {
  for (const { match, multiplier } of SPECIAL_MULTIPLIERS) {
    const matches = (Object.entries(match) as Array<[keyof RarityAttributes, string]>).every(
      ([key, value]) => attrs[key] === value
    );
    if (matches) return multiplier;
  }
  return 1;
}

export function calculateRarity(attrs: RarityAttributes): Rarity {
  const base =
    (SIZE_POINTS[attrs.size] ?? 1) +
    (DIET_POINTS[attrs.diet] ?? 1) +
    (FEATURE_POINTS[attrs.feature] ?? 1) +
    (PERSONALITY_POINTS[attrs.personality] ?? 1) +
    (HABITAT_POINTS[attrs.habitat] ?? 1);

  const total = Math.round(base * getMultiplier(attrs));

  if (total >= 18) return 'legendary';
  if (total >= 15) return 'epic';
  if (total >= 12) return 'rare';
  if (total >= 9) return 'uncommon';
  return 'common';
}
```

- [ ] **Step 8: Write the failing tests first... then verify against the implementation**

Create `src/utils/speciesHash.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateSpeciesId, calculateRarity } from './speciesHash';

describe('generateSpeciesId', () => {
  it('is deterministic for the same attributes regardless of key order', () => {
    const a = generateSpeciesId({ size: 'Gigante', habitat: 'Volcán' });
    const b = generateSpeciesId({ habitat: 'Volcán', size: 'Gigante' });
    expect(a).toBe(b);
  });

  it('matches the DX-XXX-XXX format', () => {
    const id = generateSpeciesId({ size: 'Pequeño', diet: 'Herbívoro' });
    expect(id).toMatch(/^DX-[0-9A-Z]{3}-[0-9A-Z]{3}$/);
  });

  it('produces different ids for different attributes', () => {
    const a = generateSpeciesId({ size: 'Gigante' });
    const b = generateSpeciesId({ size: 'Pequeño' });
    expect(a).not.toBe(b);
  });
});

describe('calculateRarity', () => {
  it('returns common for the lowest-point combination', () => {
    expect(
      calculateRarity({
        size: 'Mediano',
        diet: 'Herbívoro',
        feature: 'Escamas coloridas',
        personality: 'Amigable',
        habitat: 'Selva',
      })
    ).toBe('common');
  });

  it('returns legendary for the highest-point combination', () => {
    expect(
      calculateRarity({
        size: 'Coloso',
        diet: 'Oófago',
        feature: 'Alas',
        personality: 'Sigiloso',
        habitat: 'Ártico',
      })
    ).toBe('legendary');
  });

  it('applies the Coloso+Oófago+Alas multiplier', () => {
    const withoutMultiplier = calculateRarity({
      size: 'Coloso',
      diet: 'Carnívoro',
      feature: 'Alas',
      personality: 'Amigable',
      habitat: 'Selva',
    });
    const withMultiplier = calculateRarity({
      size: 'Coloso',
      diet: 'Oófago',
      feature: 'Alas',
      personality: 'Amigable',
      habitat: 'Selva',
    });
    expect(withMultiplier).toBe('legendary');
    expect(withoutMultiplier).not.toBe('legendary');
  });

  it('treats Gigante as the doc\'s Gigantesco tier (3 points)', () => {
    const giganteHigh = calculateRarity({
      size: 'Gigante',
      diet: 'Oófago',
      feature: 'Alas',
      personality: 'Sigiloso',
      habitat: 'Ártico',
    });
    expect(giganteHigh).toBe('legendary');
  });
});
```

- [ ] **Step 9: Run the tests**

Run: `npm test -- src/utils/speciesHash.test.ts`
Expected: PASS (5 tests). If `calculateRarity` totals don't land on the expected tiers, recompute by hand: common case = 1+1+1+1+1=5×1=5 (below 6, still floors to `common` since the threshold is `< 9`); legendary case = 4+4+4+3+3=18 × 1.5 (Coloso+Oófago+Alas matches) = 27 → `legendary`. Adjust test expectations only if the arithmetic genuinely disagrees — do not adjust the point tables, they're copied verbatim from `docs/RARITY_SYSTEM.md`.

- [ ] **Step 10: Commit**

```bash
git add shared/types.ts src/data/attributes.ts src/components/AttributeGroup.tsx functions/api/generate-dino.ts functions/api/generate-dino.test.ts src/utils/speciesHash.ts src/utils/speciesHash.test.ts
git commit -m "feat: widen attribute options and add species ID/rarity system"
```

---

### Task 2: ARG copy pass

**Files:**
- Modify: `src/components/Landing.tsx`, `src/components/Landing.test.tsx`
- Modify: `src/components/LoadingDino.tsx`, `src/components/LoadingDino.test.tsx`
- Modify: `src/components/EmailGateModal.tsx`, `src/components/EmailGateModal.test.tsx`
- Modify: `src/App.tsx` (AttributeGroup `description` props, restart button copy)

**Interfaces:**
- Consumes: `AttributeGroup`'s new `description` prop from Task 1.
- Produces: no new exports; copy-only changes other tasks don't depend on.

- [ ] **Step 1: Landing subtitle**

In `src/components/Landing.tsx:22`, change:

```tsx
<p className="mt-3 sm:mt-4 text-sm sm:text-base uppercase tracking-[2px] text-sage">
  Detecta tu propia especie única
</p>
```

Update `src/components/Landing.test.tsx:11` accordingly:

```ts
expect(screen.getByText('Detecta tu propia especie única')).toBeInTheDocument();
```

- [ ] **Step 2: Run Landing test**

Run: `npm test -- src/components/Landing.test.tsx`
Expected: PASS.

- [ ] **Step 3: Scanner captions per wizard step**

In `src/App.tsx`, add a `description` to each `AttributeGroup` usage (wizard steps 1-5, lines 220-260):

```tsx
<AttributeGroup
  label="Tamaño"
  description="El escáner necesita más datos para identificar la especie..."
  options={SIZES}
  selected={size}
  onSelect={handleSizeSelect}
/>
```

Repeat the same `description` string for the `Hábitat`, `Dieta`, `Característica especial`, and `Personalidad` groups (lines 226-260) — one consistent scanner line across all five steps.

- [ ] **Step 4: Rewrite the loading sequence**

Edit `src/components/LoadingDino.tsx:14-26`:

```ts
const PHASES: Phase[] = [
  { image: '/loading/egg-1-intact.png', caption: 'Señal detectada en el sector...', animationClass: 'animate-egg-breathe' },
  { image: '/loading/egg-2-wobble.png', caption: 'Analizando secuencia de ADN fósil...', animationClass: 'animate-egg-wobble' },
  { image: '/loading/egg-3-crack.png', caption: 'Especie no catalogada. Registrando...', animationClass: 'animate-egg-glow' },
  { image: '/loading/egg-4-broken-top.png', caption: 'Preparando carta de descubrimiento...', animationClass: 'animate-egg-jitter' },
  { image: '/loading/egg-5-claws.png', caption: 'Preparando carta de descubrimiento...', animationClass: 'animate-egg-tug' },
];

const BURST_PHASE: Phase = {
  image: '/loading/egg-6-burst.png',
  caption: '¡Has descubierto una nueva especie!',
  animationClass: 'animate-egg-burst',
};
```

- [ ] **Step 5: Update `LoadingDino.test.tsx`**

Replace the caption strings asserted in the test file:
- Line 24: `'Incubando el huevo...'` → `'Señal detectada en el sector...'`
- Line 35: `'Algo se mueve dentro...'` → `'Analizando secuencia de ADN fósil...'`
- Line 41: `'¡Está agrietándose!'` → `'Especie no catalogada. Registrando...'`
- Line 46: `'Está rompiendo el cascarón...'` → `'Preparando carta de descubrimiento...'`
- Line 84: `'¡Ha nacido tu dinosaurio!'` → `'¡Has descubierto una nueva especie!'`

Leave the reassurance-message tests (lines 49-72) untouched — those captions aren't part of the 4-line ARG sequence and aren't mentioned in the spec.

- [ ] **Step 6: Run LoadingDino test**

Run: `npm test -- src/components/LoadingDino.test.tsx`
Expected: PASS.

- [ ] **Step 7: EmailGateModal copy**

In `src/components/EmailGateModal.tsx:27`, change:

```tsx
<p className="text-sage mb-4">
  Escribe tu email para descargar la carta de descubrimiento.
</p>
```

Check `src/components/EmailGateModal.test.tsx` for any assertion on this string and update it to match (search for `"certificado"` in that file; if present, replace with `"carta"`).

- [ ] **Step 8: Run EmailGateModal test**

Run: `npm test -- src/components/EmailGateModal.test.tsx`
Expected: PASS.

- [ ] **Step 9: Restart button copy**

In `src/components/ResultScreen.tsx:58`, change `Crear otro dinosaurio` to `Detectar otra especie` (this will be finalized together with Task 4's other `ResultScreen` edits — for now just make this one change and update the matching assertions):

In `src/components/ResultScreen.test.tsx:47-51`, change the button name regex from `/crear otro dinosaurio/i` to `/detectar otra especie/i`.

In `src/App.test.tsx`, search for `'Crear otro dinosaurio'` — if no test currently clicks it (confirm via `grep -n "Crear otro" src/App.test.tsx`), no change needed there.

- [ ] **Step 10: Run the full test suite**

Run: `npm test`
Expected: PASS. (`ResultScreen.test.tsx` and `LoadingDino.test.tsx` are the ones touched; everything else should be unaffected by this task.)

- [ ] **Step 11: Commit**

```bash
git add src/components/Landing.tsx src/components/Landing.test.tsx src/components/LoadingDino.tsx src/components/LoadingDino.test.tsx src/components/EmailGateModal.tsx src/components/EmailGateModal.test.tsx src/components/ResultScreen.tsx src/components/ResultScreen.test.tsx src/App.tsx
git commit -m "feat: rewrite UI copy with ARG discovery narrative"
```

---

### Task 3: Card theme data + flat `Card` component (replaces `Certificate`)

**Files:**
- Create: `src/data/cardTheme.ts`
- Create: `src/components/Card.tsx`
- Create: `src/components/Card.test.tsx`
- Delete: `src/components/Certificate.tsx`, `src/components/Certificate.test.tsx`
- Modify: `src/App.tsx` (swap `Certificate` for `Card`, pass `attrs`/`speciesId`/`rarity`)
- Modify: `src/App.test.tsx` (mock path stays `./certificate` since `certificate.ts` is unchanged; update any `Certificate`-specific assumption)

**Interfaces:**
- Consumes: `generateSpeciesId`, `calculateRarity`, `RarityAttributes` from Task 1's `src/utils/speciesHash.ts`; `ATTRIBUTE_EMOJIS` from Task 1's `src/data/attributes.ts`.
- Produces: `Card` component — `forwardRef<HTMLDivElement, CardProps>` where
  ```ts
  interface CardProps {
    discovererName: string;
    result: GenerateDinoResponse;
    attrs: DinoAttributes;
  }
  ```
  Computes `speciesId` and `rarity` internally from `attrs` (so callers never have to pass them separately) — this becomes the single source of truth Task 4's `CardScene` and `ResultScreen` rely on.
- Produces (from `cardTheme.ts`): `HABITAT_COLORS: Record<Habitat, string>`, `HABITAT_REGIONS: Record<Habitat, { emoji: string; name: string }>`, `RARITY_LABELS: Record<Rarity, string>`, `RARITY_BADGE_COLORS: Record<Rarity, string>`, `getExpeditionLabel(resultId: string): string`.

- [ ] **Step 1: Write `cardTheme.ts`**

Create `src/data/cardTheme.ts`:

```ts
import type { Habitat } from '../../shared/types';
import type { Rarity } from '../utils/speciesHash';

export const HABITAT_COLORS: Record<Habitat, string> = {
  Volcán: '#2d6a9f',
  Ártico: '#2a6a9a',
  Selva: '#2a7a4f',
  Océano: '#1a5a8f',
  Desierto: '#8a5a1a',
  Montaña: '#6b5b4a',
};

export const HABITAT_REGIONS: Record<Habitat, { emoji: string; name: string }> = {
  Volcán: { emoji: '🌋', name: 'Sector Forja' },
  Ártico: { emoji: '🧊', name: 'Sector Hielo Eterno' },
  Selva: { emoji: '🌴', name: 'Sector Esmeralda' },
  Océano: { emoji: '🌊', name: 'Sector Abisal' },
  Desierto: { emoji: '🏜️', name: 'Sector Arena Roja' },
  Montaña: { emoji: '🏔️', name: 'Sector Cumbre Gris' },
};

export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Común',
  uncommon: 'Poco común',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Legendario',
};

export const RARITY_BADGE_COLORS: Record<Rarity, string> = {
  common: '#7a9e7a',
  uncommon: '#3f9d5c',
  rare: '#2d6a9f',
  epic: '#7a3f9d',
  legendary: '#caa23a',
};

const EXPEDITION_NAME = 'Expedición Pangea';

export function getExpeditionLabel(resultId: string): string {
  const number = resultId.replace(/-/g, '').slice(0, 4).toUpperCase();
  return `${EXPEDITION_NAME} #${number}`;
}
```

- [ ] **Step 2: Write the failing test for `Card`**

Create `src/components/Card.test.tsx`:

```tsx
import { createRef } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';
import type { GenerateDinoResponse, DinoAttributes } from '../../shared/types';

const result: GenerateDinoResponse = {
  resultId: 'result-1-abcd',
  scientificName: 'Volcanius ferox',
  commonName: 'Volcanrex',
  description: 'Un dinosaurio feroz que vive en volcanes.',
  imageUrl: '/images/abc.png',
};

const attrs: DinoAttributes = {
  size: 'Gigante',
  habitat: 'Volcán',
  diet: 'Carnívoro',
  feature: 'Cuernos',
  personality: 'Feroz',
};

describe('Card', () => {
  it('shows the scientific and common name, description, discoverer and date', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Card ref={ref} discovererName="Lucía" result={result} attrs={attrs} />);

    expect(screen.getByText('Volcanius ferox')).toBeInTheDocument();
    expect(screen.getByText('Volcanrex')).toBeInTheDocument();
    expect(screen.getByText(result.description)).toBeInTheDocument();
    expect(screen.getByText('Lucía')).toBeInTheDocument();
  });

  it('shows the 4 attribute cells with emoji and value', () => {
    render(<Card discovererName="Lucía" result={result} attrs={attrs} />);
    expect(screen.getByText('Gigante')).toBeInTheDocument();
    expect(screen.getByText('Carnívoro')).toBeInTheDocument();
    expect(screen.getByText('Volcán')).toBeInTheDocument();
    expect(screen.getByText('Cuernos')).toBeInTheDocument();
  });

  it('shows the deterministic species ID in DX-XXX-XXX format', () => {
    render(<Card discovererName="Lucía" result={result} attrs={attrs} />);
    expect(screen.getByText(/^DX-[0-9A-Z]{3}-[0-9A-Z]{3}$/)).toBeInTheDocument();
  });

  it('shows the rarity badge label', () => {
    render(<Card discovererName="Lucía" result={result} attrs={attrs} />);
    expect(screen.getByText('Épico')).toBeInTheDocument();
  });

  it('shows the habitat region tag and expedition footer', () => {
    render(<Card discovererName="Lucía" result={result} attrs={attrs} />);
    expect(screen.getByText('Sector Forja')).toBeInTheDocument();
    expect(screen.getByText(/Expedición Pangea #/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- src/components/Card.test.tsx`
Expected: FAIL with "Cannot find module './Card'" (the component doesn't exist yet).

- [ ] **Step 4: Write `Card.tsx`**

Create `src/components/Card.tsx`:

```tsx
import { forwardRef } from 'react';
import type { GenerateDinoResponse, DinoAttributes } from '../../shared/types';
import { ATTRIBUTE_EMOJIS } from '../data/attributes';
import { generateSpeciesId, calculateRarity } from '../utils/speciesHash';
import { HABITAT_COLORS, HABITAT_REGIONS, RARITY_LABELS, RARITY_BADGE_COLORS, getExpeditionLabel } from '../data/cardTheme';

export interface CardProps {
  discovererName: string;
  result: GenerateDinoResponse;
  attrs: DinoAttributes;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ discovererName, result, attrs }, ref) => {
    const discoveryDate = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const speciesId = generateSpeciesId(attrs);
    const rarity = calculateRarity(attrs);
    const headerColor = HABITAT_COLORS[attrs.habitat];
    const region = HABITAT_REGIONS[attrs.habitat];
    const expeditionLabel = getExpeditionLabel(result.resultId);

    const cells: Array<{ emoji: string; label: string; value: string }> = [
      { emoji: ATTRIBUTE_EMOJIS[attrs.size] ?? '', label: 'Tamaño', value: attrs.size },
      { emoji: ATTRIBUTE_EMOJIS[attrs.diet] ?? '', label: 'Dieta', value: attrs.diet },
      { emoji: ATTRIBUTE_EMOJIS[attrs.habitat] ?? '', label: 'Hábitat', value: attrs.habitat },
      { emoji: ATTRIBUTE_EMOJIS[attrs.feature] ?? '', label: 'Poder', value: attrs.feature },
    ];

    return (
      <div ref={ref} className="relative w-[360px] bg-bg text-cream corner-brackets overflow-hidden">
        <div
          className="relative px-5 pt-5 pb-8 text-center"
          style={{ backgroundColor: headerColor }}
        >
          <span
            className="absolute top-3 right-3 px-3 py-1 rounded-[40px] text-xs font-display uppercase tracking-wide text-bg"
            style={{ backgroundColor: RARITY_BADGE_COLORS[rarity] }}
          >
            {RARITY_LABELS[rarity]}
          </span>
          <p className="italic text-sm text-cream/80">{result.scientificName}</p>
          <h2 className="font-display text-2xl uppercase tracking-wide text-white">
            {result.commonName}
          </h2>
        </div>

        <div className="relative bg-surface2">
          <img
            src={result.imageUrl}
            alt={result.commonName}
            className="w-full h-56 object-contain bg-surface2"
          />
          <span className="absolute bottom-2 left-2 px-2 py-1 bg-bg/80 text-xs rounded-[40px]">
            {region.emoji} {region.name}
          </span>
          <span className="absolute bottom-2 right-2 px-2 py-1 bg-bg/80 text-xs font-mono rounded-[40px]">
            {speciesId}
          </span>
        </div>

        <div
          className="relative z-[2] -mt-[18px] mx-4 rounded-[40px] px-2 py-2 grid grid-cols-4 gap-1 text-center"
          style={{ backgroundColor: headerColor }}
        >
          {cells.map((cell) => (
            <div key={cell.label} className="flex flex-col items-center">
              <span className="text-lg" aria-hidden="true">{cell.emoji}</span>
              <span className="text-[10px] uppercase tracking-wide text-cream/70">{cell.label}</span>
              <span className="text-xs font-semibold">{cell.value}</span>
            </div>
          ))}
        </div>

        <p className="italic text-center text-sage text-sm px-6 pt-4">{result.description}</p>

        <div className="flex items-center justify-between px-5 py-4 mt-2 text-xs text-sage">
          <span>
            Descubridor/a: <strong className="text-cream">{discovererName}</strong>
          </span>
          <span className="text-right">
            {expeditionLabel}
            <br />
            {discoveryDate}
          </span>
        </div>
      </div>
    );
  }
);
Card.displayName = 'Card';
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/components/Card.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 6: Delete `Certificate`**

```bash
git rm src/components/Certificate.tsx src/components/Certificate.test.tsx
```

- [ ] **Step 7: Wire `Card` into `App.tsx`**

In `src/App.tsx`:
- Line 9: change `import { Certificate } from './components/Certificate';` to `import { Card } from './components/Card';`.
- Line 291-293 (the hidden capture node): change

```tsx
<div className="fixed -left-[9999px] top-0" aria-hidden="true">
  <Card ref={certificateRef} discovererName={discovererName} result={result} attrs={attrs} />
</div>
```

  where `attrs` is a `DinoAttributes` value — this requires Task 4's `submittedAttrs`/fetched-`attrs` state. For this task, temporarily construct it inline from the wizard's individual state fields (non-null by the time `flowState === 'result'`):

```tsx
const currentAttrs: DinoAttributes = {
  size: size!,
  habitat: habitat!,
  diet: diet!,
  feature: feature!,
  personality: personality!,
};
```

  Add this just above the `return` statement, and use `currentAttrs` in place of `attrs` above. (Task 4 replaces this with a properly-typed, non-null-assertion-free version that also works for the `/r/:id` shared-link flow.)

- Update the downloaded filename: in `downloadCertificate` (line 182-189), change the filename prefix from `certificado-` to `carta-`.

- [ ] **Step 8: Run the App test suite**

Run: `npm test -- src/App.test.tsx`
Expected: PASS. If a test fails because `attrs` is null when `loadResultFromUrl` is used (the `/r/:id` flow doesn't set `size`/`habitat`/etc., only `result` and `discovererName`), that's expected — it gets fixed in Task 4. Note the failure and proceed; do not work around it with a fallback default here.

- [ ] **Step 9: Commit**

```bash
git add src/data/cardTheme.ts src/components/Card.tsx src/components/Card.test.tsx src/App.tsx
git commit -m "feat: replace certificate with collectible card layout"
```

---

### Task 4: Return `attrs` from the results API; wire species ID + rarity into `ResultScreen`

**Files:**
- Modify: `shared/types.ts` (or `src/api.ts` — see Step 1)
- Modify: `functions/api/results/[id].ts`
- Modify: `functions/api/results/[id].test.ts`
- Modify: `src/api.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/ResultScreen.tsx`, `src/components/ResultScreen.test.tsx`

**Interfaces:**
- Consumes: `Card`'s `CardProps` from Task 3; `generateSpeciesId`/`calculateRarity` from Task 1.
- Produces: `FetchedResult` now includes `attrs: DinoAttributes`; `App.tsx` holds a single `currentAttrs: DinoAttributes | null` state used by both the live-generation flow and the `/r/:id` flow; `ResultScreen` receives `attrs: DinoAttributes` as a required prop.

- [ ] **Step 1: Return `attrs` from the results endpoint**

Edit `functions/api/results/[id].ts:17-23`:

```ts
return Response.json({
  scientificName: record.scientificName,
  commonName: record.commonName,
  description: record.description,
  imageUrl: `/images/${record.imageKey}.png`,
  discovererName: record.discovererName,
  attrs: record.attrs,
});
```

- [ ] **Step 2: Update the results endpoint test**

Open `functions/api/results/[id].test.ts`, find the test(s) asserting the JSON shape returned by `onRequestGet`, and add an assertion that `attrs` round-trips from whatever `attrs` value the test's fake `ResultRecord` was saved with — e.g. if the existing fixture saves `attrs: { size: 'Gigante', habitat: 'Volcán', diet: 'Carnívoro', feature: 'Cuernos', personality: 'Feroz' }`, add:

```ts
expect(body.attrs).toEqual({
  size: 'Gigante',
  habitat: 'Volcán',
  diet: 'Carnívoro',
  feature: 'Cuernos',
  personality: 'Feroz',
});
```

- [ ] **Step 3: Run the results endpoint test**

Run: `npm test -- functions/api/results/[id].test.ts`
Expected: PASS.

- [ ] **Step 4: Add `attrs` to `FetchedResult`**

Edit `src/api.ts:54-60`:

```ts
export interface FetchedResult {
  scientificName: string;
  commonName: string;
  description: string;
  imageUrl: string;
  discovererName: string;
  attrs: DinoAttributes;
}
```

Add `DinoAttributes` to the `import type` at the top of `src/api.ts:1`.

- [ ] **Step 5: Replace `App.tsx`'s ad-hoc `currentAttrs` with real state**

In `src/App.tsx`:
- Remove the inline `currentAttrs` construction added in Task 3 Step 7.
- Add a new state slot near the other result-related state (around line 45):

```ts
const [currentAttrs, setCurrentAttrs] = useState<DinoAttributes | null>(null);
```

- In `loadResultFromUrl` (line 68-84), after `setDiscovererName(fetched.discovererName)`, add:

```ts
setCurrentAttrs(fetched.attrs);
```

- In `handleDiscover` (line 101-121), after the line `setResult(response);`, add:

```ts
setCurrentAttrs(attrs);
```

  (`attrs` is the function's own `DinoAttributes` parameter — already in scope.)

- In `handleRestart` (line 166-180), add `setCurrentAttrs(null);` alongside the other resets.

- Update the hidden capture node (the block changed in Task 3 Step 7) to:

```tsx
{flowState === 'result' && result && currentAttrs && (
  <>
    <ResultScreen
      result={result}
      attrs={currentAttrs}
      onDownloadClick={() => setShowEmailGate(true)}
      onRestart={handleRestart}
    />
    <div className="fixed -left-[9999px] top-0" aria-hidden="true">
      <Card ref={certificateRef} discovererName={discovererName} result={result} attrs={currentAttrs} />
    </div>
  </>
)}
```

  (Gating on `currentAttrs` truthiness, rather than non-null-asserting, means the result screen simply won't render until `attrs` is available — correct for both flows since both now always set it before `flowState` becomes `'result'`.)

- [ ] **Step 6: Pass `attrs` through `ResultScreen` and show the species ID**

Edit `src/components/ResultScreen.tsx`:

```tsx
import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { shareDinoImage } from '../certificate';
import type { GenerateDinoResponse, DinoAttributes } from '../../shared/types';
import { generateSpeciesId, calculateRarity } from '../utils/speciesHash';
import { RARITY_LABELS } from '../data/cardTheme';

interface ResultScreenProps {
  result: GenerateDinoResponse;
  attrs: DinoAttributes;
  onDownloadClick: () => void;
  onRestart: () => void;
}

export function ResultScreen({ result, attrs, onDownloadClick, onRestart }: ResultScreenProps) {
  useEffect(() => {
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
  }, []);

  function handleShareClick() {
    const fileName = `dino-${result.commonName.toLowerCase().replace(/\s+/g, '-')}.png`;
    void shareDinoImage(result.imageUrl, fileName, result.commonName);
  }

  const speciesId = generateSpeciesId(attrs);
  const rarity = calculateRarity(attrs);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-xl w-full text-center">
        <p className="font-display text-accent uppercase tracking-wide text-sm mb-3">
          ¡Has descubierto una nueva especie!
        </p>
        <div className="relative w-48 h-48 sm:w-64 sm:h-64 md:w-72 md:h-72 mx-auto corner-brackets">
          <img
            src={result.imageUrl}
            alt={result.commonName}
            className="w-full h-full object-contain bg-surface2"
          />
        </div>
        <h2 className="mt-6 font-display text-2xl sm:text-3xl text-cream uppercase tracking-wide">
          {result.commonName}
        </h2>
        <p className="italic text-moss">{result.scientificName}</p>
        <p className="mt-3 text-sage">{result.description}</p>
        <div className="mt-3 text-xs text-sage uppercase tracking-wide">
          Código de especie
        </div>
        <p className="font-mono text-cream text-lg">{speciesId}</p>
        <p className="text-xs text-sage uppercase tracking-wide">{RARITY_LABELS[rarity]}</p>
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <button
            type="button"
            onClick={onDownloadClick}
            className="px-6 py-3 min-h-[44px] text-bg font-display uppercase tracking-wide bg-accent hover:shadow-[6px_6px_0_0_#f5e6c8] transition-shadow"
          >
            Descargar carta
          </button>
          <button
            type="button"
            onClick={handleShareClick}
            className="px-6 py-3 min-h-[44px] text-accent font-display uppercase tracking-wide border border-accent/40 hover:border-accent transition-colors"
          >
            Compartir dinosaurio
          </button>
        </div>
        <button
          type="button"
          onClick={onRestart}
          className="mt-4 px-4 py-2 min-h-[44px] text-sage font-display uppercase tracking-wide text-sm hover:text-cream transition-colors"
        >
          Detectar otra especie
        </button>
      </div>
    </div>
  );
}
```

(This keeps the bare-image layout from before; Task 5 is what swaps the `<img>` block for the interactive `CardScene`+`Card`. Doing the data plumbing first, independent of the 3D work, keeps this task's test diff small and reviewable.)

- [ ] **Step 7: Update `ResultScreen.test.tsx`**

Add `attrs` to every `render(<ResultScreen .../>)` call in the file:

```ts
const attrs: DinoAttributes = {
  size: 'Gigante',
  habitat: 'Volcán',
  diet: 'Carnívoro',
  feature: 'Cuernos',
  personality: 'Feroz',
};
```

(declare once near the top, alongside `result`) and pass `attrs={attrs}` in every `render` call. Update the button name assertions:
- `/descargar certificado/i` → `/descargar carta/i`
- `/crear otro dinosaurio/i` → `/detectar otra especie/i`

Add one new test:

```ts
it('shows the species ID and rarity', () => {
  render(<ResultScreen result={result} attrs={attrs} onDownloadClick={() => {}} onRestart={() => {}} />);
  expect(screen.getByText(/^DX-[0-9A-Z]{3}-[0-9A-Z]{3}$/)).toBeInTheDocument();
  expect(screen.getByText('Épico')).toBeInTheDocument();
});
```

- [ ] **Step 8: Update `App.test.tsx`**

- Every `vi.mocked(fetchResult).mockResolvedValue({...})` fixture (4 occurrences, lines 166-172, 182-188, 200-206, 222-228) needs an `attrs` field added, e.g.:

```ts
vi.mocked(fetchResult).mockResolvedValue({
  scientificName: 'Volcanius ferox',
  commonName: 'Volcanrex',
  description: 'Un dinosaurio feroz que vive en volcanes.',
  imageUrl: '/images/abc.png',
  discovererName: 'Lucía',
  attrs: { size: 'Gigante', habitat: 'Volcán', diet: 'Carnívoro', feature: 'Cuernos', personality: 'Feroz' },
});
```

- Replace every `/descargar certificado/i` button-name query with `/descargar carta/i` (lines 193, 212, 234).
- Import `DinoAttributes` is not needed in the test file (inline object literal is fine, structurally typed).

- [ ] **Step 9: Run the full suite**

Run: `npm test`
Expected: PASS across all files.

- [ ] **Step 10: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add shared/types.ts functions/api/results/[id].ts functions/api/results/[id].test.ts src/api.ts src/App.tsx src/components/ResultScreen.tsx src/components/ResultScreen.test.tsx src/App.test.tsx
git commit -m "feat: surface species ID and rarity on the result screen via stored attrs"
```

---

### Task 5: 3D `CardScene` — flip-in, tilt, spin button, legendary glow

**Files:**
- Create: `src/components/CardScene.tsx`
- Create: `src/components/CardScene.test.tsx`
- Modify: `src/components/ResultScreen.tsx` (swap the bare `<img>` block for `<CardScene>`)
- Modify: `src/components/ResultScreen.test.tsx`
- Modify: `tailwind.config.js` (glow keyframe) and/or `src/index.css` (perspective utility)

**Interfaces:**
- Consumes: `Card`/`CardProps` from Task 3; `Rarity`/`calculateRarity` from Task 1.
- Produces: `CardScene` component:
  ```ts
  interface CardSceneProps {
    discovererName: string;
    result: GenerateDinoResponse;
    attrs: DinoAttributes;
  }
  ```
  Renders the visible, interactive card (flip-in + tilt + spin button + glow). Exports pure helper `clampTilt(deltaX: number, deltaY: number, rect: DOMRect, maxDeg: number): { rotateX: number; rotateY: number }` for unit testing the tilt math without simulating real layout.

- [ ] **Step 1: Add the perspective/glow CSS**

In `src/index.css`, inside the existing `@layer utilities` block (after `.corner-brackets`), add:

```css
.card-perspective {
  perspective: 1000px;
}

.card-flipper {
  transform-style: preserve-3d;
  transition: transform 80ms linear;
  will-change: transform;
}

.card-glow-idle {
  animation: card-glow-pulse 2s ease-in-out infinite;
}

@keyframes card-glow-pulse {
  0%, 100% {
    box-shadow: 0 0 30px 8px rgba(255, 200, 50, 0.6), 0 0 60px 16px rgba(255, 150, 0, 0.3);
    opacity: 0.6;
  }
  50% {
    box-shadow: 0 0 30px 8px rgba(255, 200, 50, 0.6), 0 0 60px 16px rgba(255, 150, 0, 0.3);
    opacity: 1;
  }
}
```

- [ ] **Step 2: Write the failing test for the tilt math**

Create `src/components/CardScene.test.tsx`:

```tsx
import { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardScene, clampTilt } from './CardScene';
import type { GenerateDinoResponse, DinoAttributes } from '../../shared/types';

const result: GenerateDinoResponse = {
  resultId: 'result-1-abcd',
  scientificName: 'Volcanius ferox',
  commonName: 'Volcanrex',
  description: 'Un dinosaurio feroz.',
  imageUrl: '/images/abc.png',
};

const legendaryAttrs: DinoAttributes = {
  size: 'Coloso',
  habitat: 'Ártico',
  diet: 'Oófago',
  feature: 'Alas',
  personality: 'Sigiloso',
};

const commonAttrs: DinoAttributes = {
  size: 'Mediano',
  habitat: 'Selva',
  diet: 'Herbívoro',
  feature: 'Escamas coloridas',
  personality: 'Amigable',
};

describe('clampTilt', () => {
  it('returns zero rotation at the exact center', () => {
    const rect = { left: 0, top: 0, width: 200, height: 200 } as DOMRect;
    expect(clampTilt(100, 100, rect, 15)).toEqual({ rotateX: 0, rotateY: 0 });
  });

  it('clamps to the max degrees at the edges', () => {
    const rect = { left: 0, top: 0, width: 200, height: 200 } as DOMRect;
    const result = clampTilt(200, 200, rect, 15);
    expect(Math.abs(result.rotateX)).toBeLessThanOrEqual(15);
    expect(Math.abs(result.rotateY)).toBeLessThanOrEqual(15);
  });
});

describe('CardScene', () => {
  it('renders the card content', () => {
    render(<CardScene discovererName="Lucía" result={result} attrs={commonAttrs} />);
    expect(screen.getByText('Volcanrex')).toBeInTheDocument();
  });

  it('applies the idle glow class only for legendary rarity', () => {
    const { rerender } = render(
      <CardScene discovererName="Lucía" result={result} attrs={commonAttrs} />
    );
    expect(document.querySelector('.card-glow-idle')).not.toBeInTheDocument();

    rerender(<CardScene discovererName="Lucía" result={result} attrs={legendaryAttrs} />);
    expect(document.querySelector('.card-glow-idle')).toBeInTheDocument();
  });

  it('spins the card 360 degrees when the rotate button is clicked', async () => {
    render(<CardScene discovererName="Lucía" result={result} attrs={commonAttrs} />);
    const button = screen.getByRole('button', { name: /girar carta/i });
    fireEvent.click(button);
    const flipper = document.querySelector('.card-flipper') as HTMLElement;
    expect(flipper.style.transform).toContain('360deg');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- src/components/CardScene.test.tsx`
Expected: FAIL with "Cannot find module './CardScene'".

- [ ] **Step 4: Write `CardScene.tsx`**

Create `src/components/CardScene.tsx`:

```tsx
import { useRef, useState } from 'react';
import type { GenerateDinoResponse, DinoAttributes } from '../../shared/types';
import { Card } from './Card';
import { calculateRarity } from '../utils/speciesHash';

interface CardSceneProps {
  discovererName: string;
  result: GenerateDinoResponse;
  attrs: DinoAttributes;
}

export function clampTilt(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  maxDeg: number
): { rotateX: number; rotateY: number } {
  const px = (clientX - rect.left) / rect.width - 0.5;
  const py = (clientY - rect.top) / rect.height - 0.5;
  const rotateY = Math.max(-maxDeg, Math.min(maxDeg, px * maxDeg * 2));
  const rotateX = Math.max(-maxDeg, Math.min(maxDeg, -py * maxDeg * 2));
  return { rotateX, rotateY };
}

const MAX_TILT_DEG = 15;
const FLIP_DURATION_MS = 800;
const SPIN_DURATION_MS = 1000;
const TILT_ACTIVE_TRANSITION = '80ms linear';
const TILT_RESET_TRANSITION = '400ms ease-out';
const FLIP_TRANSITION = `transform ${FLIP_DURATION_MS}ms ease-out`;
const SPIN_TRANSITION = `transform ${SPIN_DURATION_MS}ms ease-in-out`;

export function CardScene({ discovererName, result, attrs }: CardSceneProps) {
  const [hasFlippedIn, setHasFlippedIn] = useState(false);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [transition, setTransition] = useState(FLIP_TRANSITION);
  const [spinDeg, setSpinDeg] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const flipperRef = useRef<HTMLDivElement>(null);

  const rarity = calculateRarity(attrs);
  const isLegendary = rarity === 'legendary';

  if (!hasFlippedIn) {
    // Triggers the flip-in transition on the first paint after mount.
    requestAnimationFrame(() => setHasFlippedIn(true));
  }

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (isSpinning) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const next = clampTilt(event.clientX, event.clientY, rect, MAX_TILT_DEG);
    setTransition(TILT_ACTIVE_TRANSITION);
    setTilt(next);
  }

  function handleMouseLeave() {
    if (isSpinning) return;
    setTransition(TILT_RESET_TRANSITION);
    setTilt({ rotateX: 0, rotateY: 0 });
  }

  function handleSpinClick() {
    setIsSpinning(true);
    setTransition(SPIN_TRANSITION);
    setSpinDeg((current) => current + 360);
    setTimeout(() => {
      setIsSpinning(false);
      setTransition(TILT_RESET_TRANSITION);
      setSpinDeg(0);
      setTilt({ rotateX: 0, rotateY: 0 });
    }, SPIN_DURATION_MS);
  }

  const baseFlipDeg = hasFlippedIn ? 0 : 180;
  const totalRotateY = baseFlipDeg + tilt.rotateY + spinDeg;

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="card-perspective"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div
          ref={flipperRef}
          className={`card-flipper ${isLegendary ? 'card-glow-idle' : ''}`}
          style={{
            transform: `rotateX(${tilt.rotateX}deg) rotateY(${totalRotateY}deg)`,
            transition,
          }}
        >
          <Card discovererName={discovererName} result={result} attrs={attrs} />
        </div>
      </div>
      <button
        type="button"
        onClick={handleSpinClick}
        className="px-4 py-2 min-h-[44px] text-accent font-display uppercase tracking-wide border border-accent/40 hover:border-accent transition-colors"
      >
        Girar carta
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/components/CardScene.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 6: Swap `ResultScreen`'s bare image for `CardScene`**

In `src/components/ResultScreen.tsx`, replace the block:

```tsx
<div className="relative w-48 h-48 sm:w-64 sm:h-64 md:w-72 md:h-72 mx-auto corner-brackets">
  <img
    src={result.imageUrl}
    alt={result.commonName}
    className="w-full h-full object-contain bg-surface2"
  />
</div>
<h2 className="mt-6 font-display text-2xl sm:text-3xl text-cream uppercase tracking-wide">
  {result.commonName}
</h2>
<p className="italic text-moss">{result.scientificName}</p>
<p className="mt-3 text-sage">{result.description}</p>
<div className="mt-3 text-xs text-sage uppercase tracking-wide">
  Código de especie
</div>
<p className="font-mono text-cream text-lg">{speciesId}</p>
<p className="text-xs text-sage uppercase tracking-wide">{RARITY_LABELS[rarity]}</p>
```

with:

```tsx
<CardScene discovererName="" result={result} attrs={attrs} />
<div className="mt-3 text-xs text-sage uppercase tracking-wide">
  Código de especie
</div>
<p className="font-mono text-cream text-lg">{speciesId}</p>
<p className="text-xs text-sage uppercase tracking-wide">{RARITY_LABELS[rarity]}</p>
```

Add `import { CardScene } from './CardScene';` to the top of the file.

Note: `discovererName` isn't currently a prop of `ResultScreen` (it lives in `App.tsx` state). Add it as a required prop:

```ts
interface ResultScreenProps {
  result: GenerateDinoResponse;
  attrs: DinoAttributes;
  discovererName: string;
  onDownloadClick: () => void;
  onRestart: () => void;
}

export function ResultScreen({ result, attrs, discovererName, onDownloadClick, onRestart }: ResultScreenProps) {
```

and pass `discovererName={discovererName}` to `<CardScene>` instead of `""`. Update the call site in `src/App.tsx`:

```tsx
<ResultScreen
  result={result}
  attrs={currentAttrs}
  discovererName={discovererName}
  onDownloadClick={() => setShowEmailGate(true)}
  onRestart={handleRestart}
/>
```

- [ ] **Step 7: Update `ResultScreen.test.tsx`**

Add `discovererName="Lucía"` to every `render(<ResultScreen .../>)` call. The existing assertion `expect(screen.getByText('Volcanrex')).toBeInTheDocument()` still passes because `Card` renders `commonName` too — but it will now appear inside `CardScene`'s rendered `Card`, which is fine since there's only one `Card` instance on this screen (no more hidden duplicate, since the hidden capture node lives in `App.tsx`, not `ResultScreen`).

- [ ] **Step 8: Run the full suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS, no type errors.

- [ ] **Step 9: Manual check — flip/tilt/spin/glow behave as built**

Run: `npm run dev`, walk through the wizard to a result, and confirm in the browser:
- the card flips in from face-down on arrival,
- it tilts toward the cursor and springs back on mouse-leave,
- "Girar carta" does a full 360° spin and returns to neutral,
- a legendary combination (e.g. Coloso + Ártico + Oófago + Alas + Sigiloso) shows the pulsing gold glow.

This step has no automated assertion — note in the final report whether it was visually confirmed or not.

- [ ] **Step 10: Commit**

```bash
git add src/components/CardScene.tsx src/components/CardScene.test.tsx src/components/ResultScreen.tsx src/components/ResultScreen.test.tsx src/App.tsx src/index.css
git commit -m "feat: add 3D flip/tilt/spin card interaction with legendary glow"
```
