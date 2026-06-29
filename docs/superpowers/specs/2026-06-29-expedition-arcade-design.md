# Expedition Arcade visual restyle

## Goal

Restyle the entire app's visual design to the "Expedition Arcade" theme (dark forest green, lime neon accent, Bangers + Space Grotesk type, sharp angular corners). Pure visual/UI change — no logic, state, routing, API, or component-structure changes. All existing functional `className` hooks used by tests must remain in place (tests can gain additional classes but must not lose ones they query by, unless the test itself only relied on incidental Tailwind utility classes that aren't semantically load-bearing).

## Design tokens

**Colors** (added to `tailwind.config.js` `theme.extend.colors`):
- `bg`: `#0d1a0f`
- `bg-accent-1`: `#1a3d1a`
- `bg-accent-2`: `#0f2a0f`
- `accent`: `#b2ff00` (lime neon — primary accent, borders, CTAs)
- `cream`: `#f5e6c8` (primary text)
- `text-secondary`: `#7a9e7a`
- `text-muted`: `#5a7a5a`
- Border default: `rgba(178,255,0,0.2)` used inline as `border-accent/20`

**Typography** (added to `theme.extend.fontFamily`):
- `display`: `['Bangers', 'cursive']` — headings, CTAs, common name, step questions
- `body`: `['Space Grotesk', 'sans-serif']` — everything else
- Fonts imported via `<link>` in `index.html` (Google Fonts)

**Border radius**: cap existing `rounded`/`rounded-lg`/`rounded-xl`/`rounded-full` tokens in `theme.extend.borderRadius` to 3-4px max so current `rounded-*` usage across components automatically becomes sharp without touching every className.

**Global background**: a `.grid-overlay` utility class in `index.css` (repeating-linear-gradient 40px grid at `rgba(178,255,0,0.04)` + two radial gradients using `bg-accent-1`/`bg-accent-2`) applied once on the root `<main>` in `App.tsx`.

**Corner brackets**: a `.corner-brackets` utility class in `index.css` using `::before`/`::after` to draw L-shaped lime brackets (per the spec's example CSS), reused on the result image card and the certificate card instead of a full border.

## Per-component changes

All changes are class/markup-only within existing components — no prop signature or state changes.

- **`Landing.tsx`** — badge label ("LABORATORIO DE PALEONTOLOGÍA"), two-line Bangers title (DINO cream / DISCOVERY lime+glow), muted uppercase subtitle, lime Bangers CTA with offset box-shadow on hover.
- **`WizardShell.tsx`** — progress bar restyled to 2px lime fill on `#1a1a1a` track; back arrow recolored to lime/cream.
- **`NameStep.tsx`** — Bangers question heading, dark input with lime focus border, lime Bangers "Siguiente" button.
- **`AttributeGroup.tsx`** — tiny lime uppercase step label, Bangers question heading (label prop), options rendered as cards (dark bg `rgba(178,255,0,0.05)`, lime/20 border, sharp corners) instead of pills; each card gets an emoji (≈32px) above the Bangers/cream label; selected state = lime border + `rgba(178,255,0,0.12)` bg + glow.
- **`LoadingDino.tsx`** — dark background, lime-tinted stage indicator/spinner styling; same staged emoji/message logic untouched.
- **`ResultScreen.tsx`** — image in a `.corner-brackets` card; scientific name italic/muted; common name Bangers/cream/large; description Space Grotesk `text-secondary`; lime Bangers download button.
- **`EmailGateModal.tsx`** — dark overlay, lime-bordered sharp modal, dark input with lime focus ring, lime Bangers submit button, cancel button restyled to muted outline.
- **`Certificate.tsx`** — restyled to the same palette (dark card, `.corner-brackets`, Bangers name, cream/lime text) since it's captured standalone as a PNG and must look correct without inheriting page chrome.
- **Error state block in `App.tsx`** (inline JSX, not a separate component) — restyle to match (dark bg already inherited from root `.grid-overlay` container; cream/lime text and button).

## Emoji mapping

A small local constant (object literal, not touching `shared/types.ts` or `data/attributes.ts`) maps each existing option string to its emoji, colocated with whichever component renders that attribute group:

- Size: Pequeño 🐭 / Mediano 🦎 / Gigante 🦕
- Habitat: Selva 🌴 / Desierto 🏜️ / Océano 🌊 / Montaña 🏔️ / Volcán 🌋
- Diet: Carnívoro 🥩 / Herbívoro 🌿 / Omnívoro 🍖
- Feature: Cuernos 🦄 / Alas 🦅 / Escamas coloridas ✨ / Cola poderosa 💥 / Armadura 🛡️ / Súper garras ⚡
- Personality: Feroz 😤 / Amigable 😊 / Veloz ⚡ / Sigiloso 🥷

No per-option description text is added (decided: visual-only, emoji + label per card).

## Out of scope

- `App.tsx` state machine, `api.ts`, `validation.ts`, `emailStore.ts`, `certificate.ts` capture logic, `adminAuth.ts`, all `functions/**` backend code, and the values in `data/attributes.ts`/`shared/types.ts` — untouched.
- No new dependencies beyond the Google Fonts `<link>` tags.

## Verification

After implementation, run the existing test suite (`AttributeGroup.test.tsx`, `Landing.test.tsx`, `WizardShell.test.tsx`, `ResultScreen.test.tsx`, `LoadingDino.test.tsx`, `EmailGateModal.test.tsx`, `NameStep.test.tsx`, `Certificate.test.tsx`, `App.test.tsx`) to confirm no functional regressions. Manually exercise the full flow in a browser (landing → 6 wizard steps → loading → result → email gate → certificate download) to confirm visuals match the spec and nothing is visually broken (e.g. emoji rendering, focus states, glow effects).
