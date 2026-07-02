# Dino Discovery — Full Project Audit

Date: 2026-07-02
Scope: security, privacy/legal, accessibility, mobile/responsive, SEO/GEO, performance, code quality. Read-only review — no code changed as part of this audit.

Severity legend: **Critical** (broken/exposed/legally risky now) → **High** (should fix soon) → **Medium** → **Low** → **Nitpick/Informational**.

Status legend: ✅ fixed · 🟡 partially fixed · (no marker) not yet addressed.

---

## 1. Critical

### ✅ 1.1 ~90MB of unoptimized PNG assets served at tiny display sizes (fixed 2026-07-02)
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

### ✅ 2.6 No WebP/AVIF anywhere, PNG-only (fixed 2026-07-02)
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

### ✅ 3.4 `env(safe-area-inset-*)` never used despite `viewport-fit=cover` (fixed 2026-07-02)
- **Category:** Mobile
- **Location:** `index.html` viewport meta, `src/App.tsx`'s root `<main>`, `src/components/EmailGateModal.tsx`
- **Issue:** The viewport is configured for edge-to-edge rendering but no safe-area insets were applied, so content near the top/bottom/sides could sit under the iPhone notch/Dynamic Island or home-indicator bar on modern devices.
- **Fix applied:** Added `env(safe-area-inset-*)` padding to the app's root `<main>` element (covers every screen's content, not just literal `fixed`-position elements) and to `EmailGateModal`'s full-screen overlay (via `max(1rem, env(...))` so it doesn't lose its existing padding on non-notched devices). Falls back to `0` automatically where `env()` is unsupported. This app has no persistent fixed header/footer, so this is a defensive baseline rather than a fix for an observed visual bug — **unverified on a real notched device**, since Chromium/Playwright doesn't simulate safe-area insets.

### 3.5 No age gate or parental-consent flow
- **Category:** Privacy/Legal
- **Issue:** Explicitly a kids' app, but nothing gates entry by age or requires a parent's involvement before the email-capture step. Low likelihood of enforcement action for a portfolio project, but worth a conscious decision rather than an oversight.
- **Fix:** At minimum, add a short note near the email gate ("ask a grown-up to enter their email") — a full COPPA-compliant flow is likely out of scope for a prototype but should be a documented, deliberate choice.

### ✅ 3.6 API keys never validated as non-empty before use (fixed 2026-07-02)
- **Category:** Code quality / Security
- **Location:** `functions/lib/anthropic.ts`, `functions/lib/openai.ts`
- **Issue:** If `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` are missing or empty (misconfigured secret), the failure only surfaced as an opaque 401/500 from the upstream API deep in the request path, making misconfiguration hard to diagnose.
- **Fix applied:** Both `generateDinoText` and `generateDinoImage` now throw a clear `"ANTHROPIC_API_KEY is missing or empty"` / `"OPENAI_API_KEY is missing or empty"` error immediately if the key is falsy, before making any network call. This is caught by `generate-dino.ts`'s existing try/catch (client still gets the same generic `API_ERROR` 502 response — no API contract change), but the server-side log (`console.error('generate-dino failed:', ...)`) now says exactly what's wrong instead of surfacing an opaque upstream status code. Added tests asserting the error message and that `fetch` is never called when the key is empty.

### 3.7 No unsubscribe mechanism referenced in-app
- **Category:** Privacy/Legal
- **Issue:** Once subscribed via Kit, the app gives no in-app way to find out how to unsubscribe (Kit's own emails presumably have an unsubscribe link, but this isn't verifiable from the repo and isn't mentioned anywhere in-app).
- **Fix:** Mention in the consent copy that standard unsubscribe links will be included in emails.

### ✅ 3.8 8 frontend files with no test coverage — mostly already false; remaining gap fixed 2026-07-02
- **Category:** Code quality
- **Location:** `utils/dinoCutout.ts`
- **Issue:** On investigation, 7 of the 8 files this originally listed (`AttributeGroup`, `EmailGateModal`, `Landing`, `LoadingDino`, `NameStep`, `ResultScreen`, `WizardShell`) already had real `.test.tsx` files with meaningful assertions — this finding was stale/inaccurate for those. Only `utils/dinoCutout.ts`, the one CLAUDE.md itself calls out as "fragile" with a silent-failure mode, genuinely had zero coverage.
- **Fix applied:** Extracted the chroma-key pixel math (previously inline in `cutoutDinoImage`) into an exported pure function `applyChromaKey(data: Uint8ClampedArray)`, so it's testable against a plain typed array without needing a real `<canvas>` 2D context (jsdom has none). Added `dinoCutout.test.ts` covering: exact-background-color pixels going fully transparent, far-from-background pixels staying fully opaque, the feather zone partially fading, multiple pixels being processed independently, and `cutoutDinoImage`'s fallback-to-original-URL path when `getContext('2d')` returns `null`.

### ✅ 3.9 Render-blocking Google Fonts, possibly one unused family (fixed 2026-07-02)
- **Category:** Performance
- **Location:** `index.html`, `tailwind.config.js`
- **Issue:** `preconnect` and `display=swap` were, on inspection, already in place — that part of the original finding was inaccurate. But `Bangers` (the `font-display` Tailwind token) was confirmed genuinely unused anywhere in `src/` (grepped for `font-display` excluding `font-display2`) — the card's "Terminal ARG" restyle moved it onto `font-mono` a while back and nothing else ever picked it up, so the font file was being downloaded on every page load for zero visual effect.
- **Fix applied:** Removed `Bangers` from the Google Fonts request in `index.html` and deleted the corresponding `display` entry from `tailwind.config.js`'s `fontFamily` config, down to the two fonts (`Fredoka`/`display2`, `Space Grotesk`/`body`) that are actually used. Verified visually via Playwright that the landing page still renders correctly with the remaining fonts.

### 🟡 3.10 No lazy-loading; `html2canvas` statically imported (partially fixed 2026-07-02)
- **Category:** Performance
- **Location:** `src/certificate.ts`
- **Issue:** `html2canvas` (~200KB/46KB gzip) was only needed at the final "download card" step but was bundled into the main chunk, paid for by every visitor regardless of whether they ever reach that step.
- **Fix applied:** Changed the top-level `import html2canvas from 'html2canvas'` to a dynamic `await import('html2canvas')` inside `captureCertificateAsPng`, at the point of use. This split the production bundle from one ~436KB (122KB gzip) chunk into a ~238KB (76KB gzip) main chunk plus a separate ~200KB `html2canvas` chunk loaded on demand. `certificate.test.ts`'s `vi.mock('html2canvas', ...)` continues to work transparently through the dynamic import.
- **Not done:** the `loading="lazy"` half of this finding. On inspection, every `<img>` in this app renders on a single active screen at a time (wizard step, result card, loading animation) with no scrollable off-screen content — there's no genuine "below the fold" image anywhere in the current layout, so `loading="lazy"` has no real target here and risks visibly delaying images that should appear immediately. Revisit if the layout ever grows a scrolling gallery or similar.

---

## ✅ 4. Low

All items below fixed 2026-07-02, except the last one (reviewed and confirmed intentional, no change needed).

- ✅ **Discoverer name has no length/content cap** — `sanitizeDiscovererName` in `generate-dino.ts` now trims to 40 characters and strips control characters before the name is ever written to KV; a name that's nothing left after sanitizing (e.g. control-characters-only) is rejected with the standard 400. Tests added for both truncation and control-character stripping.
- ✅ **No app-level request-body size limit** — new `functions/lib/requestBody.ts`'s `readJsonBody(request, maxBytes)` rejects oversized bodies via `Content-Length` up front (no read) and re-checks actual byte length as a fallback for clients that omit/lie about that header; wired into both `/api/generate-dino` and `/api/subscribe` with a 2000-byte cap (every real payload for either is a handful of short strings). Tests cover both rejection paths plus the valid/invalid-JSON cases.
- ✅ **No CSP or other security headers** — added `public/_headers` with a baseline CSP (`default-src 'self'` plus targeted allowances for Google Fonts and the dino-cutout's `data:` image URLs), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`. Verified locally via `wrangler pages dev dist` (only real Cloudflare Pages serving honors `_headers`, not `vite preview`) plus a Playwright pass through the landing page and wizard — zero CSP violations logged.
- ✅ **`functions/images/[key].ts` passes the URL param straight to R2 `.get()`** — now validated against `/^[a-f0-9]{64}\.png$/` (the exact shape every real image key has) before it ever reaches R2; anything else 404s immediately. Tests cover wrong-length, wrong-extension, and path-traversal-shaped keys never reaching the R2 mock.
- ✅ **Raw (unhashed) IP used as a KV key component** — `hashIdentifier` in `rateLimit.ts` SHA-256-hashes the identifier before it's used as a KV key, covering both the per-IP limit and the `subscribe:`-prefixed variant. This resets everyone's rate-limit window once on deploy (old plaintext keys are simply orphaned, not migrated) — harmless.
- ✅ **No `robots.txt` / `sitemap.xml`** — added both to `public/`; sitemap lists only the root `/` (per-result `/r/:id` pages are deliberately excluded — ephemeral, 90-day-TTL, per-visitor content, not stable indexable pages).
- ✅ **No JSON-LD structured data** — added a `WebApplication` JSON-LD block to `index.html` (`name`, `url`, `description`, a free `Offer`).
- ✅ **Text inputs' focus state is border-color only, no visible ring** — `NameStep` and `EmailGateModal`'s inputs both gained `focus-visible:ring-2 focus-visible:ring-brand-light` alongside their existing `focus:border-brand`.
- ✅ **No `aria-live` announcement on result-screen transition** — `ResultScreen` now renders a visually-hidden `role="status" aria-live="polite"` paragraph announcing the discovered dino's name on mount. Test added asserting the announcement's content.
- ✅ **Single JS bundle, no code-splitting** — `ResultScreen` and `Card` are now `React.lazy`-loaded from `App.tsx` behind one `<Suspense>` boundary (fallback reuses the existing `LoadingDino` component, no new asset). Main bundle: 213KB (68KB gzip), down further from the html2canvas-splitting fix; `Card`/`ResultScreen` load as separate ~10KB/~16KB chunks only once a discovery completes. `Card`'s `forwardRef` still works fine through `lazy()` for the hidden `html2canvas` capture node.
- **`discovererName` freeform, exposed via unauthenticated `/r/:id`** — reviewed, not changed: confirmed intentional. The route has no sensitive data to protect (no auth, no PII beyond a freeform name) and the whole point is a shareable link that works for anyone holding it, matching the physical-card metaphor the app is built around.

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

## Post-audit follow-up: html2canvas replaced with modern-screenshot (2026-07-02)

Not originally a numbered finding in this audit, but raised directly by the user after this audit shipped: the card download's rendering fidelity had already caused two real, user-reported bugs (the rotated habitat-tag label rendering blank, and a white-corner artifact around the card's rounded corners — both documented in CLAUDE.md). The root cause of both was architectural, not incidental: **html2canvas re-implements CSS rendering itself** (manually redrawing gradients/transforms/filters onto a canvas) rather than using the browser's real rendering engine, so any CSS feature it doesn't perfectly replicate silently breaks only in the captured output, never live — exactly the failure mode both prior bugs had.

**Fix:** swapped to `modern-screenshot` (MIT, actively maintained), which serializes the DOM into an SVG `<foreignObject>` and lets the browser itself render it before rasterizing — CSS features render correctly by construction instead of via a second, imperfect reimplementation. Same call shape, dynamically imported at the point of use as before. Bonus: the on-demand chunk shrank from html2canvas's ~200KB (~47KB gzip) to modern-screenshot's ~24KB (~9KB gzip). The CSP's `connect-src` was defensively widened to allow `fonts.gstatic.com`/`fonts.googleapis.com`, since the library's font-embedding step can fetch font files to inline them (not observed to trigger for the actual captured `Card`, which only uses `font-mono`, but left in for future-proofing). Verified via updated unit tests, a clean production build, and a live `wrangler pages dev` + Playwright pass with zero console/CSP errors.

**Not yet verified:** the actual downloaded PNG's pixels, against a real (non-placeholder) generated card — this environment has no API keys to drive a full generation. Both prior html2canvas bugs were only ever caught by literally running the capture and inspecting the output, not by live-browser or unit-test checks; the same standard applies here before this can be called fully verified. This also doesn't change the separate, still-open item below (dino 3D pop-out clipping at the capture's bounding box) — that's a bounding-box behavior any DOM-capture library shares, not something either library's rendering-fidelity difference fixes.

---

## Suggested triage order

1. Privacy policy + consent checkbox at email gate (2.1, 2.2) — legal exposure, cheap to add.
2. ErrorBoundary (2.5) — cheap, meaningfully improves failure mode for a kids' audience.
3. Image compression pass (1.1, 2.6) — biggest performance lever, mechanical work using existing script patterns.
4. `/r/:id` OG metadata (2.3) — restores the actual point of the share feature.
5. Basic meta tags + robots.txt/sitemap (2.4, low-tier SEO items) — cheap, bundle together.
6. Accessibility batch (3.1–3.3, low-tier a11y items) — bundle together, moderate effort.
7. Everything else opportunistically alongside other work in the same files.
