# Dino Discovery — Full Project Audit

Date: 2026-07-02
Scope: security, privacy/legal, accessibility, mobile/responsive, SEO/GEO, performance, code quality. Read-only review — no code changed as part of this audit.

Severity legend: **Critical** (broken/exposed/legally risky now) → **High** (should fix soon) → **Medium** → **Low** → **Nitpick/Informational**.

---

## 1. Critical

### 1.1 ~90MB of unoptimized PNG assets served at tiny display sizes — ✅ FIXED 2026-07-02
- **Category:** Performance
- **Location:** `public/icons/medallions/*.png` (~59MB, 27 files), `public/habitats/*.png` (~29MB, 12 files), plus `card-back.png`/`landing-logo.png`
- **Issue:** Medallion icons render at 48–132px and habitat backgrounds fill a 420px-wide card, but the source PNGs were full-resolution (1024px+), uncompressed assets. This was by far the largest lever on load time, especially on mobile networks.
- **Fix applied:** Added `scripts/optimize-images.mjs` (one-off, uses `sharp`'s palette/imagequant PNG encoder) which resizes each asset class to ~2x its real display size (medallions 320px, habitat/card-back 900px wide, landing-logo 640px wide) and recompresses in place. Result: full static asset set went from ~106MB to ~10.1MB (~90% reduction), with no visible quality loss on spot-checked images (dragon-wing medallion, arctic habitat, card-back, emblem). All 141 existing tests and the production build still pass unchanged. Documented in CLAUDE.md — re-run after any future asset regeneration.
- **Not done as part of this fix:** WebP/AVIF conversion (tracked separately as 2.6) — this was a same-format resize+recompress pass only.

---

## 2. High

### 2.1 No privacy policy despite email capture on a kids' product
- **Category:** Privacy/Legal
- **Issue:** `EmailGateModal` collects email addresses (via Kit) with no linked privacy policy, no statement of what the data is used for, and no consent checkbox. Given this is explicitly a children's app, this is a real legal exposure (GDPR at minimum; COPPA-adjacent if any US under-13 users).
- **Fix:** Add a privacy policy page/route, link it from the email gate, and add an explicit opt-in checkbox before subscribing rather than folding consent into the download action.

### 2.2 No consent/marketing disclosure at the point of email capture
- **Category:** Privacy/Legal
- **Location:** `src/components/EmailGateModal.tsx`, `functions/api/subscribe.ts`, `functions/lib/kit.ts`
- **Issue:** The email is silently added to a Kit marketing form. Nothing on screen tells the (likely parent, submitting on behalf of a child) user that this subscribes them to marketing emails.
- **Fix:** State clearly what the email will be used for next to the input, and/or make list subscription an explicit separate checkbox from "download my card."

### 2.3 `/r/:id` shared result pages have no per-result metadata
- **Category:** SEO/GEO
- **Location:** `index.html`, `functions/api/results/[id].ts`, `App.tsx`'s `loadResultFromUrl`
- **Issue:** The whole point of a shareable `/r/:id` link is that pasting it into iMessage/WhatsApp/Twitter shows a rich preview of the specific dino. Because this is a pure client-side SPA with static `index.html` meta tags, every shared link preview is generic (or blank) — the viral-share mechanic is currently non-functional for its actual purpose.
- **Fix:** Add a lightweight Pages Function that intercepts `/r/:id` requests from bots/crawlers/link-unfurlers (or all requests) and injects per-result OG tags (image, name, description) server-side before falling through to the SPA shell for real browsers.

### 2.4 No meta description / Open Graph / Twitter Card / canonical tags
- **Category:** SEO/GEO
- **Location:** `index.html`
- **Issue:** No `<meta name="description">`, no `og:*`/`twitter:*` tags, no canonical URL. Hurts both classic SEO and any link-preview/AI-answer-engine surfacing of the site.
- **Fix:** Add standard meta tags to `index.html` (title, description, og:image using a representative card, og:url, twitter:card=summary_large_image).

### 2.5 No React ErrorBoundary anywhere
- **Category:** Code quality
- **Issue:** Any uncaught render error white-screens the entire app with no recovery path — especially bad for a kids' product where the "explain what went wrong" audience is a child, not a developer.
- **Fix:** Wrap the app (or at minimum the wizard/result/card subtree) in an ErrorBoundary that falls back to a friendly "something went wrong, try again" screen matching the existing error state styling.

### 2.6 No WebP/AVIF anywhere, PNG-only — ✅ FIXED 2026-07-02
- **Category:** Performance
- **Issue:** Every static image asset (medallions, habitats, card back, logo, loading eggs, wordmark) shipped as PNG only, no modern-format alternative. Compounded with 1.1 above.
- **Fix applied:** Extended `scripts/optimize-images.mjs` to emit a `.webp` copy alongside each PNG it processes (also picked up the two assets 1.1 missed: loading eggs and the `dino-discovery-logo.png` wordmark). Switched every code reference (`cardTheme.ts`'s medallion/habitat/card-back paths, `Landing.tsx`'s wordmark, `LoadingDino.tsx`'s egg images) to the `.webp` path, with corresponding test updates. Deliberately **no `<picture>`/PNG fallback** — WebP has near-universal support and this codebase already has hard-won, documented experience that `<picture>`/CSS-transform tricks can silently fail inside `html2canvas`'s capture (used for the card download), so a plain `<img src="*.webp">` was preferred to avoid introducing that risk on the card's habitat/medallion/card-back images. PNG originals are kept in `public/` as source/fallback but aren't referenced by any code path. Verified via Playwright screenshots of the landing page and wizard tiles rendering correctly, plus the full test suite and production build passing unchanged. Total `public/` footprint: ~17MB (10.1MB PNG source + 4.6MB WebP served).

---

## 3. Medium

### 3.1 No `<h1>` anywhere in the app
- **Category:** Accessibility / SEO
- **Issue:** No page in the flow (landing, wizard, result) uses an `<h1>`, hurting both screen-reader page-structure navigation and SEO heading hierarchy.
- **Fix:** Give the landing page's wordmark/tagline area (or a visually-hidden equivalent) a real `<h1>`.

### 3.2 Card's tilt/flip interaction has no keyboard equivalent
- **Category:** Accessibility
- **Location:** `src/components/CardScene.tsx`
- **Issue:** The 3D tilt/flip is mouse-hover and touch-drag only. A keyboard-only user can trigger "Girar carta" (a button) but can't tilt, and there's no indication the card is even interactive beyond that button.
- **Fix:** Not necessary to replicate the full 3D drag via keyboard, but ensure the flip button has a clear focus state and consider an `aria-label` describing the card's current face/state for screen readers.

### 3.3 `EmailGateModal` lacks dialog semantics
- **Category:** Accessibility
- **Location:** `src/components/EmailGateModal.tsx`
- **Issue:** No `role="dialog"`, `aria-modal="true"`, no focus trap, no Escape-to-close handling. A screen-reader or keyboard user can lose their place or tab out to background content while the modal is open.
- **Fix:** Add proper dialog ARIA attributes, trap focus within the modal while open, restore focus to the triggering element on close, and support Escape.

### 3.4 `env(safe-area-inset-*)` never used despite `viewport-fit=cover` — ✅ FIXED 2026-07-02
- **Category:** Mobile
- **Location:** `index.html` viewport meta, `src/App.tsx`'s root `<main>`, `src/components/EmailGateModal.tsx`
- **Issue:** The viewport is configured for edge-to-edge rendering but no safe-area insets were applied, so content near the top/bottom/sides could sit under the iPhone notch/Dynamic Island or home-indicator bar on modern devices.
- **Fix applied:** Added `env(safe-area-inset-*)` padding to the app's root `<main>` element (covers every screen's content, not just literal `fixed`-position elements) and to `EmailGateModal`'s full-screen overlay (via `max(1rem, env(...))` so it doesn't lose its existing padding on non-notched devices). Falls back to `0` automatically where `env()` is unsupported. This app has no persistent fixed header/footer, so this is a defensive baseline rather than a fix for an observed visual bug — **unverified on a real notched device**, since Chromium/Playwright doesn't simulate safe-area insets.

### 3.5 No age gate or parental-consent flow
- **Category:** Privacy/Legal
- **Issue:** Explicitly a kids' app, but nothing gates entry by age or requires a parent's involvement before the email-capture step. Low likelihood of enforcement action for a portfolio project, but worth a conscious decision rather than an oversight.
- **Fix:** At minimum, add a short note near the email gate ("ask a grown-up to enter their email") — a full COPPA-compliant flow is likely out of scope for a prototype but should be a documented, deliberate choice.

### 3.6 API keys never validated as non-empty before use
- **Category:** Code quality / Security
- **Location:** `functions/lib/anthropic.ts`, `functions/lib/openai.ts`
- **Issue:** If `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` are missing or empty (misconfigured secret), the failure only surfaces as an opaque 401/500 from the upstream API deep in the request path, making misconfiguration hard to diagnose.
- **Fix:** Add a cheap startup/early-request check that fails fast with a clear "missing API key" error if the env var is empty.

### 3.7 No unsubscribe mechanism referenced in-app
- **Category:** Privacy/Legal
- **Issue:** Once subscribed via Kit, the app gives no in-app way to find out how to unsubscribe (Kit's own emails presumably have an unsubscribe link, but this isn't verifiable from the repo and isn't mentioned anywhere in-app).
- **Fix:** Mention in the consent copy that standard unsubscribe links will be included in emails.

### 3.8 8 frontend files with no test coverage
- **Category:** Code quality
- **Location:** `AttributeGroup`, `EmailGateModal`, `Landing`, `LoadingDino`, `NameStep`, `ResultScreen`, `WizardShell`, `utils/dinoCutout.ts`
- **Issue:** `dinoCutout.ts` in particular is called out in CLAUDE.md as "fragile" with a silent-failure mode, yet has no test coverage. The others are core flow components.
- **Fix:** Prioritize `dinoCutout.ts` (pure-function chroma-key logic is testable without a real DOM/canvas edge cases) and `EmailGateModal` (form validation logic) first.

### 3.9 Render-blocking Google Fonts, possibly one unused family
- **Category:** Performance
- **Location:** `index.html`
- **Issue:** Three font families loaded via a render-blocking `<link>`; CLAUDE.md's rebrand notes suggest `Bangers`/`font-display` may no longer be used anywhere except intentionally excluded card styling — worth confirming and dropping if truly unused.
- **Fix:** Add `font-display: swap` (if not already implied by Google Fonts' default), preconnect to `fonts.gstatic.com`, and audit actual usage of each loaded family before keeping all three.

### 3.10 No lazy-loading; `html2canvas` statically imported
- **Category:** Performance
- **Location:** `src/certificate.ts` (or wherever `html2canvas` is imported), general image tags
- **Issue:** `html2canvas` is only needed at the final "download card" step but is bundled into the main chunk. No images use `loading="lazy"`.
- **Fix:** Dynamic `import('html2canvas')` at the point of use; add `loading="lazy"` to below-fold images (habitat/medallion galleries if any exist outside the active card).

---

## 4. Low

- **Discoverer name has no length/content cap** — unbounded KV value growth from freeform input. (`functions/api/generate-dino.ts`) — cap length server-side (e.g. 40 chars) and strip control characters.
- **No app-level request-body size limit** on `/api/generate-dino` / `/api/subscribe` — add an explicit byte-size check before parsing JSON.
- **No CSP or other security headers** (no `public/_headers` file) — add a baseline CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy` via Cloudflare Pages `_headers`.
- **`functions/images/[key].ts` passes the URL param straight to R2 `.get()`** with no allowlist/format check — low risk since R2 bucket scoping already contains blast radius, but worth a basic key-format validation (expects only generated hash-like keys).
- **Raw (unhashed) IP used as a KV key component** for rate limiting — consider hashing (e.g. SHA-256) the IP before using it as a key, since it's PII and KV values/keys may be more widely visible (dashboard access, backups) than necessary.
- **No `robots.txt` / `sitemap.xml`** — add both; trivial and free SEO hygiene for a public site.
- **No JSON-LD structured data** — add a minimal `WebApplication` or `Product`/`Game`-type JSON-LD block to `index.html`.
- **Text inputs' focus state is border-color only, no visible ring** — add a visible `focus-visible` ring for keyboard users, since color-only focus indication can fail WCAG 2.4.7 for users with low contrast sensitivity.
- **No `aria-live` announcement on result-screen transition** — after the loading screen completes, screen-reader users get no announcement that the result is ready; add a visually-hidden `aria-live="polite"` region.
- **Single JS bundle, no code-splitting** (436KB/122KB gzip) — not large enough to be urgent, but `React.lazy`-splitting the result/card screens from the landing/wizard bundle would shrink initial load.
- **`discovererName` freeform, exposed via unauthenticated `/r/:id`** — low risk (no auth data attached), but worth noting the shared-link path has zero access control by design; confirm this is intentional and acceptable.

---

## 5. Informational / Verified Clean

These were checked and found to be in good shape — noted so they aren't second-guessed later:

- No hardcoded secrets found in the repo; `npm audit --omit=dev` reports 0 vulnerabilities.
- No `dangerouslySetInnerHTML`/`innerHTML` usage anywhere — AI-generated text (name/description) is rendered as plain React children, so no XSS vector there.
- No open redirects; admin-key comparison is constant-time as documented in CLAUDE.md.
- All 5 wizard attributes are validated server-side against an allowlist (`VALID_SIZES`/`VALID_HABITATS`/`VALID_DIETS` etc.) in `functions/api/generate-dino.ts`.
- Alt text present and descriptive on wizard tiles and card medallions; wizard tile buttons are real `<button>` elements with `aria-pressed`/`aria-label` and are keyboard-operable; touch targets are ≥44px.
- `Card.tsx`'s cyan/magenta terminal-ARG text-on-background contrast is well above WCAG AA when checked against the actual color values.
- `<html lang="es">` is correctly set.
- Zero `console.log/debug/warn` left in shipped code; zero `any`/`@ts-ignore`/`@ts-expect-error` — TypeScript strict mode is genuinely respected throughout.
- No dead-code leftovers from the deleted `?variants` dev preview route mentioned in CLAUDE.md.

---

## 6. CLAUDE.md-documented known gaps — re-verified status

All of the following, already tracked in `CLAUDE.md`'s "Known gaps / defects" section, were re-checked against current code and confirmed **still accurate**:

- `.card-perspective`'s `touch-action: none` still means a touch starting on the card can't fall through to page scroll on short screens.
- html2canvas download still doesn't account for the dino's 3D pop-out past the card's frame edge, or the mobile fit-scale wrapper — unverified against a real (non-placeholder) generated image, as the doc itself says.
- `certificate.ts`'s `share()` call still happens after multiple `await`s (html2canvas render, `toBlob`, optionally `subscribeEmail`), which is very likely to fall outside iOS Safari's synchronous-user-gesture requirement for `navigator.share()` — still unverified on a real device, still the highest-impact untested risk per the doc's own assessment.
- `docs/RARITY_SYSTEM.md`'s worked examples still contain the documented arithmetic errors (not independently re-derived here — trusted per the doc's own note to prefer the point tables).
- `ATTRIBUTE_SLUGS` un-accented mismatch with `RARITY_SYSTEM.md` confirmed intentional, not a bug.
- No a11y or visual-regression tooling exists in `package.json`, confirmed.

### New items worth adding to CLAUDE.md
Of everything above, the two most consequential items that aren't tracked anywhere in the project's own documentation yet are **2.3 (`/r/:id` missing per-result share metadata — defeats the sharing feature's purpose)** and **2.1/2.2 (no privacy policy or consent flow for a kids' email-capture product)**. Worth promoting into CLAUDE.md's "Known gaps" section regardless of when/whether they get fixed.

---

## Suggested triage order

1. Privacy policy + consent checkbox at email gate (2.1, 2.2) — legal exposure, cheap to add.
2. ErrorBoundary (2.5) — cheap, meaningfully improves failure mode for a kids' audience.
3. Image compression pass (1.1, 2.6) — biggest performance lever, mechanical work using existing script patterns.
4. `/r/:id` OG metadata (2.3) — restores the actual point of the share feature.
5. Basic meta tags + robots.txt/sitemap (2.4, low-tier SEO items) — cheap, bundle together.
6. Accessibility batch (3.1–3.3, low-tier a11y items) — bundle together, moderate effort.
7. Everything else opportunistically alongside other work in the same files.
