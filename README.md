# Dino-discovery
AI-powered dinosaur generator where children invent their own creature via attribute selection and receive a personalized "Official Discoverer" certificate

## Tech stack

Vite + React + TypeScript + Tailwind CSS, deployed on Cloudflare Pages with Wrangler.

## Getting started

```bash
npm install
npm run dev       # start the Vite dev server
npm run build     # type-check and build for production
npm run preview   # preview the production build locally
npm test          # run the Vitest test suite
npm run typecheck # run TypeScript without emitting output
```

Copy `.dev.vars.example` to `.dev.vars` and fill in API keys for local Cloudflare Pages Functions development.

## Despliegue

1. `npm install`
2. `npx wrangler kv namespace create RATE_LIMIT_KV` y `npx wrangler kv namespace create CACHE_KV`, copiar los IDs a `wrangler.jsonc`
3. `npx wrangler r2 bucket create dino-discovery-images` (requiere tener R2 activado en el dashboard de Cloudflare)
4. `npx wrangler pages project create dino-discovery-generator --production-branch main`
5. `npx wrangler pages secret put ANTHROPIC_API_KEY --project-name dino-discovery-generator`
6. `npx wrangler pages secret put OPENAI_API_KEY --project-name dino-discovery-generator`
7. `npm run build`
8. `npx wrangler pages deploy dist --project-name dino-discovery-generator`

## Desarrollo local

1. Copiar `.dev.vars.example` a `.dev.vars` y rellenar las claves reales
2. `npx wrangler pages dev dist --compatibility-date=2026-06-28 --compatibility-flags=nodejs_compat` (tras `npm run build`), o `npx wrangler pages dev -- npm run dev` para recarga en caliente del frontend

## Notas sobre el modelo de imagen

El proyecto usa `gpt-image-2` (calidad `low`) para generar las imágenes de dinosaurios, en vez de `dall-e-3` (descontinuado) o `gpt-image-1` (se descontinúa el 23 de octubre de 2026). `gpt-image-2` devuelve la imagen en base64 directamente, sin URL temporal que expire.
