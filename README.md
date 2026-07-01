**EN** | [ES](README.es.md)

# Dino Discovery — AI Dinosaur Card Generator
### QA / product-engineering project | React · TypeScript · Cloudflare Workers · Claude · GPT Image

[![Deploy](https://img.shields.io/github/actions/workflow/status/melinDross/DinoDiscovery/deploy.yml?branch=main&label=deploy)](https://github.com/melinDross/DinoDiscovery/actions/workflows/deploy.yml)
[![Live site](https://img.shields.io/website?url=https%3A%2F%2Fdino-discovery-generator.pages.dev&label=live%20demo)](https://dino-discovery-generator.pages.dev)
[![Last commit](https://img.shields.io/github/last-commit/melinDross/DinoDiscovery)](https://github.com/melinDross/DinoDiscovery/commits/main)
[![License](https://img.shields.io/badge/license-PolyForm%20Noncommercial-blue)](LICENSE)

![Result card — a real AI-generated discovery](docs/screenshots/result-card.png)

Dino Discovery is a kids' web app where a child builds their own dinosaur by picking five attributes (size, habitat, diet, special feature, personality) through a short wizard, and receives back an AI-generated creature — image, scientific name, common name, and a three-sentence description — reframed as a collectible **"species discovery" card**: a deterministic species ID, a computed rarity tier, illustrated habitat art behind the dino, and a 3D flip/tilt card you can drag with a finger or mouse.

**Live:** [dino-discovery-generator.pages.dev](https://dino-discovery-generator.pages.dev)

This README documents the project as a **QA and product-engineering case study**: not just what was built, but the actual bugs found, the wrong approaches tried and reverted, and the reasoning behind each design decision — the same kind of trail I'd leave for a teammate picking up this code cold.

---

## 🚀 Quick start

```bash
git clone https://github.com/melinDross/DinoDiscovery.git
cd DinoDiscovery
npm install
npm run dev        # Vite dev server at localhost:5173 (frontend only)
```

The dev server above runs the frontend alone — the wizard and card work, but generating a dino needs the backend (Cloudflare Pages Functions) with your **own** Anthropic/OpenAI API keys, since those aren't included in the repo. For the full stack locally or to deploy your own copy, see "⚙️ Running it locally" further down.

---

## 💡 Where the idea came from

The starting point wasn't "let's build an AI dinosaur generator" in the abstract — it was a reference trading card I liked the layout of, and a question: could a kid design *this*, with an AI filling in the art and the flavor text?

![Reference card layout that inspired the collectible-card framing](docs/screenshots/design-reference-card.png)

That reference (a fantasy-TCG-style card, dark background, stone attribute panel, rarity/tier footer) is where the "collectible card, not just a generated image" framing came from. The actual visual language ended up diverging a lot from this reference over several restyles (see "How I built it" below) — but the structural idea of *attributes → art → rarity → collectible object* traces straight back to it.

---

## 🧒 Who it's for

Kids (roughly ages 5–10) who like dinosaurs and collectible-card games, playing solo or with a parent reading the picks aloud. The wizard is deliberately simple — six-way picture-button choices, no reading required beyond attribute names, auto-advance after each pick — and the payoff (a shareable, downloadable card) is designed to feel like *finding* something rather than *generating* something, hence the "alternate-reality-game species discovery" framing (deterministic species IDs, rarity tiers, "Descubridor/a" credit) instead of a plain "here's your AI image" result screen.

---

## 🛠️ Tools and technologies

| Layer | Choice | Why |
|---|---|---|
| **Frontend** | React 19 + TypeScript (strict) + Vite | Fast dev loop, strict types catch attribute/rarity mismatches at compile time |
| **Styling** | Tailwind CSS | Utility-first fit the card's very literal pixel-math layout (see "Card layout" in `CLAUDE.md`) |
| **Backend** | Cloudflare Pages Functions | Same deploy as the frontend, no separate API host to manage |
| **Storage** | Cloudflare KV (cache, rate-limit, results) + R2 (generated images) | Serverless, pay-per-use, no database to provision for a low-traffic prototype |
| **Text generation** | Anthropic Claude (`claude-haiku-4-5`) | Cheap, fast, reliable strict-JSON output for name/description |
| **Image generation** | OpenAI `gpt-image-2` | Chosen over `dall-e-3` (discontinued) and `gpt-image-1` (sunsetting Oct 2026); returns base64 directly, no expiring URL to race against |
| **Email capture** | Kit (ConvertKit) v4 API | Best-effort lead capture, explicitly never blocks the download (see "Design decisions") |
| **Testing** | Vitest + Testing Library | Same toolchain for frontend components and Pages Functions backend logic |
| **Deploy** | GitHub Actions → Cloudflare Pages | Auto-deploy on every push to `main`, ~40s build+deploy |

---

## 🐛 Technical problems solved

A sample of the real engineering problems this project ran into — not a feature list, a "what actually went wrong and how it got fixed" list:

- **The downloaded card didn't match the on-screen card.** `html2canvas` (used to rasterize the card into a downloadable PNG) doesn't reliably capture a CSS `transform: rotate()` on text — three different CSS techniques for the rotated habitat-tag label all rendered fine live but came out **blank** in the actual captured file. Confirmed with pixel-level sampling of the real output, not just a visual glance. Fixed by pre-rendering the label onto a `<canvas>` and displaying it as a plain `<img>`, since `html2canvas` just copies image bitmaps directly.
- **A white artifact appeared outside the card's rounded corners in the download.** `html2canvas` defaults to an opaque white canvas background; the card's rounded corners are CSS `overflow-hidden` clipping, not real alpha — so the area outside them rasterized as solid white. Fixed with `backgroundColor: null`.
- **A reported "huge rendering difference" turned out to be a viewer-side artifact, not a real bug.** After a report of misaligned pills and washed-out colors in the download, I reproduced the exact scenario, then sampled the actual PNG's pixel data directly (not a screenshot of a screenshot) — full opacity, clean edges, no checkerboard in the file itself. The visual artifact only appeared when *my own verification screenshots* downscaled the image, which pointed to the same thing happening in the phone/desktop preview thumbnail the user was viewing it through. Reported this back with the evidence instead of either dismissing the report or blindly "fixing" a non-bug.
- **The landing video appeared to loop every ~4 seconds despite having no `loop` attribute.** Root cause: an inline arrow-function `ref` callback got a new identity on every re-render, and React detaches+reattaches a ref whenever its callback identity changes — so the ref's `.play()` call re-fired on every re-render, and a background counter ticking every 4s was re-rendering the component that often. Calling `.play()` on an ended video restarts it from 0 per the HTML5 spec. Fixed by memoizing the ref callback.
- **A CSS gradient panel appeared to break in an early debugging pass**, but a controlled isolation test (swap gradient for flat color, re-check) proved the panel was never the problem — the actual regression was elsewhere. Documented in-repo so a future pass doesn't re-investigate a dead end.
- **iOS Safari corrupted the card's front/back faces mid-flip** even with vendor-prefixed 3D CSS properties — a known WebKit bug where `backface-visibility: hidden` doesn't reliably hide a face inside a 3D-transformed, filtered subtree. Fixed with a browser-agnostic JS fallback (`visibility` toggle timed to the rotation midpoint) layered on top of the CSS, since this specific failure mode doesn't reproduce in Chromium/Playwright at all — only verifiable on a real device.

---

## 🏗️ How I built it

### Phase 1 — Core generation flow

Wizard (five attribute steps + name) → `POST /api/generate-dino` → parallel Anthropic (text) + OpenAI (image) calls → R2-stored image + KV-cached text, keyed by a hash of the five attributes so the same combo never re-generates. Rate-limited by IP (fixed window in KV) to control API spend, with an admin bypass header for testing.

### Phase 2 — From "generated image" to "collectible card"

The result screen was reframed around the reference card image above: a deterministic species ID (hash of sorted attributes), a point-based rarity system (`docs/RARITY_SYSTEM.md`) with special-combo multipliers, illustrated per-habitat background art (two sub-biome variants each, picked deterministically so repeats feel intentional), and a stone attribute-medallion panel.

### Phase 3 — The card as a physical object

3D flip/tilt interaction: drag horizontally to rotate, drag vertically to tilt, snap to the nearest face on release, a holo-foil sheen for rare+ cards built from three independently-moving CSS layers (a single reactive layer read as "sliding," not "shimmering" — this took three iterations to get right, see `CLAUDE.md`'s "Rarity visual" section for the two approaches that broke iOS's 3D compositing before landing on the current one).

### Phase 4 — Four full visual restyles, chosen live

The card's visual identity went through **four live-compared style directions** before shipping: the original green/purple fantasy look, a cream/gold "museum specimen" look, a comic/sticker look, and the current "Terminal ARG" style (near-black glass, cyan/magenta glow, monospace type) — built via a disposable dev-only preview route with a switcher, compared side-by-side, then the losing three deleted. The same technique was reused for smaller decisions: the frame's border color (4-way comparison), two rejected border textures, and the habitat tag's placement (3-way comparison between a rotated pill, a spine-label strip, and a bookmark ribbon).

### Phase 5 — Making the download trustworthy

This is where most of the "Technical problems solved" bugs above surfaced — the gap between "renders correctly in the browser" and "renders correctly in the `html2canvas`-rasterized PNG" turned out to be the single largest source of real bugs in the project, none of which were visible without literally running the capture and inspecting pixel data.

### Phase 6 — Mobile + real-device polish

Fit-to-container scaling for the card (a `ResizeObserver`-driven `transform: scale()` wrapper, since the card's internal layout is fixed-width pixel math not worth making fluid), touch-drag tilt/rotate, and a handful of real-device-only bugs (the iOS flip corruption above, a landing-page white flash on rubber-band overscroll, a video "loop" that was actually a re-render bug) that Chromium/Playwright never reproduced and could only be confirmed on an actual phone.

---

## 📸 Screenshots

| Landing | Wizard | Loading | Result card |
|---|---|---|---|
| ![Landing screen](docs/screenshots/landing.png) | ![Wizard attribute step](docs/screenshots/wizard.png) | ![Loading screen](docs/screenshots/loading.png) | ![Result card](docs/screenshots/result-card.png) |

The result card above ("Dragón de Fuego") is a real generation, not a mockup — Coloso / Volcán / Carnívoro / Alas / Feroz, épico rarity.

---

## 🧪 How I tested this

**136 automated tests** (Vitest + Testing Library), covering frontend components and backend Pages Functions with in-memory fakes for KV/R2 — no shared mock library, each test file builds its own `createFakeKV`/`createEnv` helpers. Backend and frontend share the same test runner and conventions.

What automated tests *don't* cover, and how those gaps got handled instead:

- **The card's CSS layout has no visual-regression tests.** Verified manually via Playwright screenshots at multiple breakpoints (320–844px) during development, and via real-device testing for iOS-specific bugs Chromium can't reproduce (the 3D-flip corruption, the video loop).
- **The `html2canvas` download path has no automated pixel-diff test.** Every bug in that path (see "Technical problems solved") was found by writing a one-off comparison harness — render the same component two ways, actually run `html2canvas`, sample the resulting PNG's pixel data with `getImageData`, and compare — then deleting the harness once the bug was fixed and documented. This was a deliberate choice: a permanent pixel-diff test suite would be the "right" long-term answer, but wasn't justified for a prototype with one contributor and an infrequently-touched rendering path.
- **When a bug report turned out to be a false positive** (the "huge rendering difference" that was actually a viewer-side thumbnail artifact), the same rigor applied in reverse — I didn't take the report at face value *or* dismiss it, I reproduced the exact scenario and inspected the actual bytes before concluding it wasn't a real bug.

---

## 🎯 Design decisions

**Never block the download on email verification.** Evaluated and explicitly rejected — Kit's free tier has no reliable way to notify the app of a confirmed subscription without a polling wait screen, and the fraction of users who'd abandon rather than wait wasn't worth it. The email is still captured and sent to Kit; it just never gates the certificate download.

**The on-screen watermark deters screenshots without pretending to block them.** No web API can stop a phone's native screenshot. Instead, the *interactive* card shows a repeating watermark; the hidden node that produces the actual email-gated download does not. A screenshot of the live card carries the watermark; the real download doesn't — making the legitimate download path the objectively better artifact, rather than trying (and failing) to block the illegitimate one. (Currently paused on-screen pending confirmation the download rendering is pixel-perfect — see `CLAUDE.md`.)

**Cache by attribute combination, not by user.** The same five attributes always resolve to the same cached text + image (keyed by a hash of the combo, versioned so prompt changes can bust the cache), but each submission still gets its own `resultId` and shareable link — so two different kids can each "discover" the same species with their own certificate, without re-paying the generation cost.

**One source of truth for validation logic that exists in two places.** The wizard's attribute lists (frontend) and the backend's request validation are necessarily two separate lists (3,456 possible combinations) — documented explicitly in `CLAUDE.md` as a manual-sync point rather than pretending a single source of truth exists where it doesn't.

---

## 📁 Repository structure

```
Dino-discovery/
├── src/                        # React frontend
│   ├── components/              # Landing, wizard, Card/CardScene (the ARG card), result screen
│   ├── data/                    # cardTheme (habitat art, rarity labels), attributes
│   ├── utils/                   # speciesHash (rarity/ID), dinoCutout (chroma-key)
│   └── certificate.ts           # html2canvas capture + share/download
├── functions/                   # Cloudflare Pages Functions (backend)
│   ├── api/                     # generate-dino, results/:id, subscribe
│   └── lib/                     # anthropic, openai, r2, cache, rateLimit, kit
├── shared/types.ts               # Types shared between frontend and backend
├── docs/
│   ├── RARITY_SYSTEM.md          # Point tables and rarity tier thresholds
│   ├── future-features.md        # Evaluated ideas, including deliberately-rejected ones
│   ├── screenshots/               # Images used in this README
│   └── superpowers/               # Design specs and implementation plans per feature
├── scripts/                       # One-off AI asset generation (medallions, card back, logo)
└── CLAUDE.md                      # Technical memory: every bug, decision, and why
```

`CLAUDE.md` is the real engineering log of this project — updated after every push to `main`, it documents not just what the code does but every wrong turn taken to get there (failed CSS approaches, reverted watermark tuning, the panel-gradient dead end). This README is the summary; `CLAUDE.md` is the detail.

---

## 🕓 Version history

| Version | Highlights |
|---|---|
| v0.1–v0.2.3 | Core wizard + generation flow, result persistence via `/r/:id`, restart/share/confetti, mobile touch targets |
| v0.3–v0.4 | Rarity visual (holo-foil), 3D drag-to-rotate/tilt, iOS compositing fixes |
| v0.5 | Landing screen redesign (video, transparent wordmark, live discovery counter), medallion icon regeneration |
| v0.6 | Full card restyle ("Terminal ARG"), amber frame, rotated habitat tag, on-screen watermark |
| v0.6.1 | Fixed habitat tag and white-corner artifacts in the actual downloaded PNG |

Full detail per release: [GitHub Releases](https://github.com/melinDross/DinoDiscovery/releases).

---

## 🚫 Ideas evaluated and not pursued

From `docs/future-features.md` — kept here because *deciding not to build something* is as much a product decision as building it:

- **Email verification gating the download** — evaluated, explicitly rejected (see "Design decisions").
- **Highlight/result deduplication across sessions** — not attempted; the collectible-card framing means the same species being "discovered" twice by different kids is a feature, not a bug.
- **Per-habitat contextual scenes for every habitat** — only "Volcán" currently composites the dino into a habitat-appropriate scene; extending this to all six habitats needs prompt engineering, not architecture changes.
- **"My collection" view** — the data layer for it already exists (every result persists with a shareable `resultId`), the view itself was never built.
- **PDF export, basic analytics, E2E tests** — explicitly out of scope for this prototype; the reasoning for each is in `docs/future-features.md`.

---

## ⚙️ Running it locally

```bash
npm install
npm run dev        # Vite dev server (frontend only, no backend functions)
npm run build       # tsc --noEmit && vite build
npm run preview     # preview the production build locally
npm test            # vitest run — full 136-test suite
npm run typecheck   # tsc --noEmit only
```

For the full stack locally (frontend + Cloudflare Pages Functions), copy `.dev.vars.example` to `.dev.vars`, fill in `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`, then either:
- `npx wrangler pages dev dist --compatibility-date=2026-06-28 --compatibility-flags=nodejs_compat` (after `npm run build`), or
- `npx wrangler pages dev -- npm run dev` for frontend hot-reload with functions running.

### Deploying your own copy

1. `npx wrangler kv namespace create RATE_LIMIT_KV` / `CACHE_KV` / `RESULTS_KV`, copy the IDs into `wrangler.jsonc`
2. `npx wrangler r2 bucket create dino-discovery-images`
3. `npx wrangler pages project create dino-discovery-generator --production-branch main`
4. `npx wrangler pages secret put ANTHROPIC_API_KEY / OPENAI_API_KEY / KIT_API_KEY / KIT_FORM_ID / ADMIN_KEY --project-name dino-discovery-generator`
5. `npm run build && npx wrangler pages deploy dist --project-name dino-discovery-generator`

---

## 📜 License

[PolyForm Noncommercial 1.0.0](LICENSE) — free to view, run, modify, and share for any non-commercial purpose (learning, personal projects, forks). Selling this project or using it commercially isn't permitted under this license.

---

## 🔗 Repository

[github.com/melinDross/DinoDiscovery](https://github.com/melinDross/DinoDiscovery)

---

Found a bug, have an idea, or just want to say hi? [Open an issue](https://github.com/melinDross/DinoDiscovery/issues) — I read every one. If you liked the project and want to support the API costs of keeping the live demo running, [Ko-fi](https://ko-fi.com/melindross) is very appreciated. ☕
