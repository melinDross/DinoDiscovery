# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

AI-powered dinosaur generator where children pick attributes (size, habitat, diet, feature, personality) via a wizard, get an AI-generated dino (image + name + description), and receive a collectible "card" reframed as an ARG (alternate-reality-game) species discovery — deterministic species ID, rarity tier, illustrated habitat art, 3D flip/tilt interaction.

Live: https://dino-discovery-generator.pages.dev

Tech stack: Vite + React 19 + TypeScript (strict) + Tailwind CSS, deployed on Cloudflare Pages with Wrangler (Pages Functions for the backend, KV for caching/rate-limiting/results, R2 for generated images).

## Commands

```bash
npm install
npm run dev        # Vite dev server (frontend only, no backend functions)
npm run build       # tsc --noEmit && vite build
npm run preview     # preview the production build locally
npm test            # vitest run — full suite
npm test -- path/to/file.test.ts          # single test file
npm test -- path/to/file.test.ts -t "name" # single test by name
npm run typecheck   # tsc --noEmit only
```

Local full-stack dev (frontend + Pages Functions): copy `.dev.vars.example` to `.dev.vars`, fill in API keys, then either:
- `npx wrangler pages dev dist --compatibility-date=2026-06-28 --compatibility-flags=nodejs_compat` (after `npm run build`), or
- `npx wrangler pages dev -- npm run dev` for hot-reloading the frontend while functions run.

One-off asset generation scripts (NOT part of the build, run manually, need `OPENAI_API_KEY` exported in the shell — `set -a && source .dev.vars && set +a` works):
```bash
node scripts/generate-landing-logo.mjs       # public/landing-logo.png
node scripts/generate-medallion-icons.mjs    # public/icons/medallions/*.png (27 files)
node scripts/generate-card-back.mjs          # public/card-back.png
```

### Deploy

1. `npx wrangler kv namespace create RATE_LIMIT_KV` / `CACHE_KV` / `RESULTS_KV`, copy IDs into `wrangler.jsonc`
2. `npx wrangler r2 bucket create dino-discovery-images`
3. `npx wrangler pages project create dino-discovery-generator --production-branch main`
4. `npx wrangler pages secret put ANTHROPIC_API_KEY / OPENAI_API_KEY / KIT_API_KEY / KIT_FORM_ID / ADMIN_KEY --project-name dino-discovery-generator`
5. `npm run build && npx wrangler pages deploy dist --project-name dino-discovery-generator`

## Architecture

### Request flow (live generation)

`App.tsx` drives a single-page state machine (`'landing' | 'wizard' | 'loading' | 'result' | 'error'`). The wizard collects `DinoAttributes` (size, habitat, diet, feature, personality) one screen at a time via `AttributeGroup`, auto-advancing ~500ms after each pick (`scheduleAdvance`/`clearPendingAdvance` in `App.tsx`, guards against double-submission on rapid clicks).

On the last pick, `handleDiscover` POSTs to `/api/generate-dino` (`functions/api/generate-dino.ts`):
1. Rate-limits by IP (`functions/lib/rateLimit.ts`: 5/hour, fixed window in KV) unless `X-Admin-Key` matches `ADMIN_KEY` (`functions/lib/adminAuth.ts`, constant-time compare).
2. Computes a cache key from the 5 attributes (`functions/lib/hash.ts`: SHA-256 of `size|habitat|diet|feature|personality|v2` — the `v2` suffix exists to invalidate old cache entries when the generation prompt changed background color; bump it again if the image/text prompts change in a way that should bust the cache).
3. On cache hit (`functions/lib/cache.ts`, KV, no TTL — cached forever): reuses the stored text + image key, still creates a **new** `resultId` and result record (so the same attribute combo can be "discovered" by multiple kids with separate shareable links/discoverer names, but a single generated image/text asset).
4. On cache miss: calls Anthropic (`functions/lib/anthropic.ts`, `claude-haiku-4-5`, strict JSON-only prompt for `{scientificName, commonName, description}`) and OpenAI (`functions/lib/openai.ts`, `gpt-image-2`, quality `low`, **prompt pins the background to a solid `#0d1a0f`** — see "Dino cutout" below, this is load-bearing) in parallel, stores the image in R2 (`functions/lib/r2.ts`), caches the text+imageKey, then proceeds like a hit.
5. Saves a `ResultRecord` (`functions/lib/results.ts`, KV, 90-day TTL) keyed by `resultId`, including the full `attrs` — needed so `/r/:id` shared links can rebuild the card client-side, not just show the image.

Images are served via `functions/images/[key].ts` (R2 → `image/png`, immutable 1-year cache).

`/r/:id` deep links: `App.tsx`'s `loadResultFromUrl` calls `GET /api/results/:id` (`functions/api/results/[id].ts`), which returns the stored record **including `attrs`** — both the live-generation path and the shared-link path converge on a single `currentAttrs` state in `App.tsx`, so the result screen never renders without attrs (gate: `flowState === 'result' && result && currentAttrs`).

### Email capture (Kit)

`EmailGateModal` → `subscribeEmail` → `POST /api/subscribe` (`functions/api/subscribe.ts`) → `functions/lib/kit.ts`'s two-step Kit v4 flow (create subscriber, then add to form). This is explicitly best-effort and **never blocks the download** — `App.tsx`'s `handleEmailConfirm` calls `subscribeEmail` in a try/catch that swallows failures, then always calls `downloadCertificate()` regardless of outcome.

### The card (ARG layer)

This is the most-iterated part of the codebase; read this before touching `Card.tsx`/`CardScene.tsx`.

**Rarity system** (`src/utils/speciesHash.ts`, spec in `docs/RARITY_SYSTEM.md`): each of the 5 attributes has a point table; `calculateRarityScore` sums them and applies special-combo multipliers (e.g. Coloso+Oófago+Alas ×1.5), `calculateRarity` buckets the total into 5 tiers (common/uncommon/rare/epic/legendary, thresholds 9/12/15/18), `RARITY_TIER_NUMBERS` maps tiers to 1-5 for the "Tier" display and star count. **`'Gigante'` intentionally carries the point value `docs/RARITY_SYSTEM.md` assigns to `'Gigantesco'`** — it was *not* renamed to avoid breaking the many existing tests/UI strings that already say `'Gigante'`; this is documented inline in the point table, don't "fix" it without checking that comment first.

`generateSpeciesId` hashes the sorted attribute values into a deterministic `DX-XXX-XXX` code — same attrs always produce the same ID, reinforcing the "this species already existed" narrative.

**Habitat art** (`src/data/cardTheme.ts`): each of the 6 habitats has 2 illustrated sub-biome backgrounds (`public/habitats/{slug}-1.png` / `-2.png`, real AI-illustrated assets, not placeholders). `pickHabitatBackground(attrs)` selects one deterministically (char-code sum of all 5 attribute values, mod 2) — same attrs always render the same scene.

**Dino cutout** (`src/utils/dinoCutout.ts`): the generated dino image has a *flat, opaque* background (no alpha channel — OpenAI doesn't return transparent PNGs from this prompt), but it's pinned to the known solid color `#0d1a0f` by the generation prompt in `functions/lib/openai.ts`. `cutoutDinoImage` chroma-keys that exact color out client-side (canvas `getImageData`, distance-threshold + feather), so the dino composites as a true cutout over the habitat art instead of showing as a flat rectangle. **This is fragile**: if the OpenAI prompt's background color or the cache-key version changes, `BACKGROUND_COLOR` in `dinoCutout.ts` must be updated to match, or cutout silently fails (no error — `useDinoCutout` in `Card.tsx` falls back to the original, un-cut image on any load/decode failure, so the failure mode is "looks like before this feature existed," not a crash).

**Card layout** (`src/components/Card.tsx`): stacked in three sibling layers, intentionally *not* nested, so z-index ordering is simple:
1. The framed box (rounded corners, `border-[20px]`, `overflow-hidden`) — habitat background, stone attribute-medallion panel, score/rarity/tier row, footer. Anything that must stay clipped to the card's rounded shape goes here.
2. The dino `<img>` (cutout, `scale-105`, `object-top`, multi-layer `drop-shadow` filter, `z-20`) — rendered as a **sibling after** the framed box, specifically *not* inside its `overflow-hidden`, so a big creature's claw/tail/horn can visually pop past the black border for a 3D effect. Positioned with inline styles using `CARD_BORDER_PX`/`ART_HEIGHT_PX` constants that must stay in sync with the framed box's `border-[20px]` / `h-[440px]` Tailwind classes (duplicated because Tailwind arbitrary-value classes can't be parameterized from JS at build time). The scale was originally `110%` centered (`object-contain`'s default), but real-device testing showed dinos getting visually cropped at the bottom edge near the medallion panel — pulled back to `105%` and switched to `object-top` so any letterboxing slack from the source image's aspect ratio collects at the bottom (away from the panel) instead of being split top/bottom.
3. A text/tag overlay (species ID, rarity badge, sub-biome name, name/sci-name/description, `z-30`) — a **further sibling after** the dino layer, so text stays legible no matter how far the dino's cutout extends. (Earlier iteration had the dino on top of everything including this text — don't regress to that.)

**The attribute medallion `<img>`s need `max-w-none`** — Tailwind's preflight sets `img { max-width: 100% }`, which silently clamped the larger center "Poder" medallion (`w-16` = 64px) down to its grid column's actual width (~59px on most cards, narrower than 64px once `gap-1` and the 5-column split are accounted for). The result was a non-square image box that the `rounded-[40px]` clip then rendered as a flat-topped shape instead of a circle — easy to miss because the other four medallions (`w-12` = 48px) fit within the column without being clamped, so only the center one looked broken. Any future medallion/icon sizing in this component should include `max-w-none` if the element is wider than its grid cell.

**The medallion panel must not have a negative top margin** — an earlier version had `-mt-[10px]` on the panel to visually fuse it with the art above (a "continuous stone tablet" look). That's wrong: the text/tag overlay's description gradient block (`z-30`, `bg-gradient-to-t from-bg ...`, anchored `bottom-0` within the same 440px art area) is fully opaque (`from-bg`) at its own bottom edge, which sits exactly where that negative margin pulled the panel into. Since the gradient is a higher z-index, it painted solid color over the top of every medallion — looked exactly like the icons were clipped (and was reported that way twice before the real cause was found), but nothing was actually clipping anything; one element was just covering another. The panel now has no top margin. Don't reintroduce overlap between the panel and the art area above it without also checking what the description gradient looks like at that boundary. The panel's background is also no longer a flat `#1c1c1c` — it's a layered `radial-gradient`/`linear-gradient` (green + purple accents) to read as fantasy-themed rather than a flat dark box, generated with CSS only (no new AI-illustrated asset, to keep scope small — if a richer illustrated texture is wanted later, generate one the same way `scripts/generate-card-back.mjs` does and swap this gradient for a background-image).

`ATTRIBUTE_MEDALLION_PATHS` (`cardTheme.ts`) maps every attribute *value* (26 total) to a generated icon at `public/icons/medallions/{slug}.png`, plus a `emblem.png` brand mark. All 27 were generated once via `scripts/generate-medallion-icons.mjs` and committed as binary assets — there's no runtime generation.

**Card back / flip** (`src/components/CardScene.tsx`): a true two-sided flip (`backface-visibility: hidden` on both `.card-face` elements, back pre-rotated 180deg in CSS), not a fake rotation of the same front content. `public/card-back.png` was AI-generated (`scripts/generate-card-back.mjs`) to approximate a reference logo image the user pasted in chat — **Claude has no tool to extract pasted/attached image bytes to disk**, so any future "use this exact image" request needs the user to save the file into the repo themselves; the fallback is generating a close approximation via the same one-off script pattern.

**The 3D flip properties need `-webkit-` prefixes** (`perspective`/`transform-style: preserve-3d`/`backface-visibility`/the back face's `rotateY(180deg)`) in `src/index.css` — iOS Safari silently ignores the unprefixed versions. **This alone was not sufficient**: real-device testing on iOS Safari still showed the front and back faces blended/corrupted together mid-flip even with prefixes — a known WebKit bug where `backface-visibility: hidden` doesn't reliably hide a face when it (or a descendant, here the dino's `drop-shadow` filter layer) is inside a 3D-transformed subtree. The actual fix is a **browser-agnostic JS fallback** in `CardScene`: a `facing: 'front' | 'back'` state explicitly toggles `visibility` on each `.card-face` element, timed via `setTimeout` to the approximate 90°/270° crossing point of each rotation (half the flip-in duration; roughly the first and third quarters of the spin duration) — independent of whether `backface-visibility` itself works. Keep both the CSS property and the JS toggle; don't remove either. This can't be verified by Playwright/Chromium (which doesn't reproduce the bug) — only by testing on a real iOS Safari device.

CSS for the 3D mechanics lives in `src/index.css` under `@layer utilities`: `.card-perspective` / `.card-flipper` (flip+tilt+spin, transform composed by *summing* flip-degrees + tilt-degrees + spin-degrees rather than true 3D composition — works because they're all single-axis rotateY contributions) / `.card-face` / `.card-face-back` / `.card-glow-idle` (legendary-only pulsing box-shadow keyframe).

`CardScene.clampTilt` is exported and unit-tested in isolation (pure function, no DOM needed for the math itself).

**Mobile responsiveness** (`CardScene.tsx`): `Card.tsx` stays fixed at a 420px design width internally — its 3-layer px-based stacking (see above) isn't worth making fluid. Instead `CardScene` wraps it in a `ResizeObserver`-driven container: an outer measuring `<div>` (`outerRef`) reports the available width, `computeFitScale(availableWidth, 420)` (pure function, unit-tested) computes a `0–1` scale factor, and an inner `<div>` (`innerRef`) applies `transform: scale(...)` with `transformOrigin: 'top center'`. Because the scale is a single CSS transform on the wrapper, all three of `Card.tsx`'s absolutely-positioned sibling layers (frame/dino/text) shrink together and never drift out of alignment. **The fit-scale is width-only** — an attempt to also fit to viewport height (to avoid scrolling to reach the buttons below) was reverted after it shrunk the card far more than necessary on both mobile *and* desktop; don't reintroduce a height constraint here without explicitly gating it to narrow/mobile viewports, and expect users to scroll a little to reach the buttons on short screens. The outer wrapper's `height` is set explicitly to `(naturalHeight + DINO_OVERFLOW_BUFFER_PX) * scale` (buffer `56`px, for the dino's pop-out past the frame edges) since `transform` doesn't affect layout box size — without that, the wrapper would reserve the wrong height.

**The outer/inner wrapper divs must not be `display: flex` with default `align-items: stretch`** — an earlier version used `className="w-full flex justify-center"` on the outer div to center the inner div horizontally, but stretch silently compressed the *unscaled* inner div down to whatever height was last set on the outer div (itself derived from the *previous* measurement), creating a shrink-to-fit box far shorter than the card's real content height; the card then visually overflowed past that box (CSS transform doesn't get clipped by a box too small for its pre-transform content) and collided with the buttons below — this was the literal cause of a "card overlaps the share/download buttons on mobile" bug.

**The inner div must not be centered with `margin: auto` either** — that was the *next* fix attempted (`mx-auto` on a plain block instead of flex), and it's *also* wrong: `margin: auto` resolves to `0` (left-aligning, not centering) once the child's own intrinsic width (`420px`, unscaled — CSS transforms don't change the layout box used for margin resolution) exceeds the parent's width, which is exactly the case on any phone narrower than 420px. The card rendered visibly off-center as a result. The actual fix: `position: absolute; left: 50%` on the inner div with `transform: translateX(-50%) scale(${scale})` — `translateX(-50%)` centers using the element's own box regardless of how that compares to the parent's width.

**The fit-scale is measured in `useLayoutEffect`, not `useEffect`** — using `useEffect` let the card paint once at its full unscaled 420px size before the effect ran and corrected it, a visible flash/overflow on the first frame that `useLayoutEffect` (which runs before the browser paints) eliminates.

`CardScene` also has `onTouchMove`/`onTouchEnd`/`onTouchCancel` handlers mirroring the existing mouse-tilt handlers, so the tilt effect works on touch devices. Verified manually via Playwright at 320/375/390/667/844px combinations — no overflow, no button overlap, text legible, layout intact down to the narrowest common phone width (375×667, iPhone SE). The flip-corruption and centering fixes were specifically verified against real-device screenshots the user provided (iOS Safari); Playwright/Chromium did not reproduce either bug, so don't trust a clean Playwright run alone as proof these are fixed if either is touched again.

**Drag-to-rotate**: dragging the card (`onTouchStart`/`onTouchMove`/`onTouchEnd` on `.card-perspective`) rotates it live with the finger **horizontally** — `spinDeg` (rotateY) is set directly from the horizontal drag delta (`DRAG_SENSITIVITY_DEG_PER_PX = 0.6`) with `transition: 'none'` so the rendered rotation always matches the touch position exactly, no easing lag. On release it snaps to whichever face (front/back, nearest multiple of 180°) ended up closer, animated over `DRAG_SNAP_TRANSITION`. Because the rotation is driven directly by state during a drag (no CSS-interpolated unknown), `facing` is computed synchronously from the live angle on every `touchmove` rather than via the `setTimeout` approximation used for the button-triggered spin/flip-in (where the actual visual angle is CSS-interpolated and JS can't read it without polling — the timer approach there is a deliberate, separate technique, not a leftover to consolidate). **Vertical finger movement during the drag still drives the small clamped parallax tilt only** (`clampTilt`, ±15°) — a free/unclamped vertical drag (mirroring the horizontal one) was tried and explicitly reverted on user feedback that it felt worse than the original tilt, even though it worked correctly. Don't reintroduce it without being asked.

**The button-triggered spin's facing/reset logic must be relative to the spin's *actual* starting face, never hardcoded** — since drag-to-rotate can leave the card resting on its back, and "Girar carta" is a flat `spinDeg += 360` (always ends visually where it started), an earlier version unconditionally reset `facing` to `'front'` and `spinDeg` to `0` when the spin's `setTimeout` completed. If the spin was triggered while showing the back face, that hardcoded reset snapped the card to the front face instantly right as the animation finished — a visible jump-cut ("the card disappears for a frame"). Fixed by capturing `startFacing` before the spin begins, sequencing the mid-spin facing toggle relative to it (`front→back→front` or `back→front→back`), and resetting `spinDeg` by literally subtracting the `360` that was added (`current - 360`) rather than to a hardcoded `0`, so the end state is guaranteed identical to the start state.

**Zoom is locked app-wide** (`index.html`'s viewport meta: `maximum-scale=1.0, user-scalable=no`; `touch-action: manipulation` on `html, body` in `index.css`) since this is a kids' app and the only gesture that should do anything is the card's own tilt/flip — pinch-zoom and double-tap-zoom are disabled everywhere, not just the result screen (no per-route way to scope a `<meta viewport>` tag). Note iOS Safari has ignored `user-scalable=no` for accessibility since iOS 10; `maximum-scale=1.0` plus `touch-action: manipulation` is the practical mitigation, not a hard guarantee.

**`background-color` must be set on `html`, not just `body`** — iOS Safari's rubber-band overscroll bounce reveals whatever is behind `body` when you scroll past the content edge, which is `html`'s background; left at the browser default (white), this caused a visible white flash at the top/bottom of the page during normal scrolling. Fixed by setting the same `#0d1a0f` on both `html` and `body` in `index.css`, plus `overscroll-behavior-y: none` to disable the bounce outright.

### Known gaps / defects

- **html2canvas download doesn't see the dino's 3D pop-out, and also doesn't see the mobile fit-scale wrapper.** The hidden capture node in `App.tsx` (`<Card ref={certificateRef} .../>`, used by `captureCertificateAsPng`) renders the bare `Card` component directly, not through `CardScene`'s scaling wrapper — this is intentional (the download should always be the full-resolution 420px card, not whatever scale the viewport happened to render at), but it also means if a dino's cutout extends past the framed box's edges, html2canvas — which canvases based on the target ref's own bounding box — will likely clip it at that boundary in the downloaded PNG, even though it's visible on screen. Not yet verified against a real (non-placeholder) generated image; worth checking before relying on the pop-out effect surviving the download.
- **`docs/RARITY_SYSTEM.md`'s worked examples contain real arithmetic errors** (caught during implementation — e.g. a fixture the doc calls "Épico" actually scores "Raro" under its own point table). Trust the point tables over the doc's narrative examples; `speciesHash.test.ts` and `Card.test.tsx` have inline comments where this was corrected.
- **`ATTRIBUTE_SLUGS`/file-naming mismatches are intentional, not bugs**: project strings use accented Spanish (`'Súper garras'`, `'Escamas coloridas'`, `'Ártico'`) while `docs/RARITY_SYSTEM.md`'s reference implementation used slightly different un-accented keys (`'Super garras'`, `'Escamas'`) — `speciesHash.ts`'s point tables were re-keyed to match the project's actual strings, not the doc verbatim.
- **`dinoCutout.ts` requires same-origin images** (canvas `getImageData` throws/taints on cross-origin without proper CORS headers). Production images are served same-origin via `/images/[key].ts`, so this is fine in practice, but don't point `result.imageUrl` at a third-party host without revisiting this.
- **The wizard's expanded attribute lists (6/4/6/4/6 = 3,456 combos) are validated independently in two places**: `src/data/attributes.ts` (frontend option lists) and `functions/api/generate-dino.ts`'s `VALID_SIZES`/`VALID_HABITATS`/`VALID_DIETS` (backend request validation). They must be kept in sync manually — there's no shared single source of truth for the *option lists* (there is one for the *types*, in `shared/types.ts`).
- No automated browser/visual tests exist for the card's CSS layout (border thickness, overlap, drop-shadow positioning) — verification during development has been manual (Playwright MCP screenshots in dev sessions, not committed as tests). Layout regressions in `Card.tsx` won't be caught by `npm test`.
- **`certificate.ts`'s download/share flow has never been verified on a real iOS device and is a plausible silent-failure point.** `navigator.share()` is called only after several `await`s (`html2canvas()` render, `canvas.toBlob()`, and in the email-gate path also a prior `await subscribeEmail(...)` network call) — iOS Safari requires `share()` to fire within the synchronous tail of the originating user gesture, and this almost certainly doesn't qualify, meaning `share()` likely throws and falls through to the `<a download>` blob-URL fallback, which has its own history of inconsistent support on iOS Safari. This is unverified, not confirmed broken — but it's the single highest-impact untested risk in the app, since download/share is the entire payoff moment. If you're asked to fix it, the real fix requires restructuring so `share()` (or the download click) happens synchronously in the click handler with a pre-existing blob, not after async work.
- **No automated a11y or visual-regression tooling** (`package.json` has no `jest-axe`-equivalent, no Percy/Chromatic-equivalent) — every mobile-layout fix in this project to date has relied on manual Playwright screenshots taken during the session plus the user checking a real device; nothing in `npm test` would catch a regression to `Card.tsx`/`CardScene.tsx` layout or accessibility.

### Testing conventions

Vitest + Testing Library, jsdom environment (`src/test-setup.ts`, which also stubs `ResizeObserver` since jsdom doesn't implement it — needed by `CardScene`'s fit-to-container scaling). One test file per component/util, colocated (`Foo.tsx` + `Foo.test.tsx`). Backend functions tests live under `functions/**/*.test.ts` and fake the KV/R2 bindings with plain in-memory objects (see `createFakeKV`/`createEnv` helpers repeated per test file — no shared mock library). Cloudflare-specific globals (`R2Bucket`, `PagesFunction`) come from `@cloudflare/workers-types`.

## Updating this file

**After every `git push` to `main`, review whether this file needs updating** (new architecture, new known defect, changed convention) and update it in the same or a follow-up commit before considering the work done.
