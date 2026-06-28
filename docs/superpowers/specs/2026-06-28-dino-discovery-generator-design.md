# Dino Discovery Generator — Design Spec

## Resumen

Web app infantil (5-10 años) donde el niño/a elige atributos de un dinosaurio, recibe un dinosaurio único generado por IA (nombre, descripción e imagen) y puede descargar un certificado de descubrimiento en PNG tras dejar su email.

## Arquitectura

```
React + Vite (Cloudflare Pages)
       │
       ▼
Cloudflare Worker (/api/generate-dino)
       │
       ├─► Rate limit check (KV, por IP, 5/hora)
       ├─► Cache check (KV, key = hash de atributos)
       │      │
       │      └─ HIT → devuelve { nombre, descripción, imageUrl (R2) }
       │
       └─ MISS:
            ├─► Anthropic API (claude-haiku-4-5) → nombre + descripción
            ├─► OpenAI API (dall-e-3, standard, 1024x1024) → imagen temporal
            ├─► Worker descarga la imagen y la sube a R2
            └─► Guarda resultado en KV (texto + key de imagen en R2)
```

Las API keys de Anthropic y OpenAI viven solo como secrets del Worker (`wrangler secret put`). El frontend nunca las conoce ni las usa directamente — toda generación pasa por el endpoint del Worker.

## Stack

- **Frontend:** React (Vite) + Tailwind CSS, desplegado en Cloudflare Pages
- **Backend:** Cloudflare Worker (TypeScript)
- **Storage:**
  - KV namespace `RATE_LIMIT_KV` — contadores por IP, TTL 1h
  - KV namespace `CACHE_KV` — resultados cacheados por combinación de atributos
  - R2 bucket `DINO_IMAGES` — imágenes permanentes (las URLs de DALL-E 3 expiran en ~1h, así que se descargan y re-alojan en R2 para que el cache funcione indefinidamente)
- **APIs externas:** Anthropic (`claude-haiku-4-5`) para texto, OpenAI (`dall-e-3`, calidad standard, 1024x1024) para imagen
- **Descarga de certificado:** html2canvas (PNG)
- **Testing:** Vitest + Miniflare para lógica del Worker (sin E2E en el MVP)

## Atributos seleccionables

- Tamaño: Pequeño / Mediano / Gigante
- Hábitat: Selva / Desierto / Océano / Montaña / Volcán
- Dieta: Carnívoro / Herbívoro / Omnívoro
- Característica especial: Cuernos / Alas / Escamas coloridas / Cola poderosa / Armadura / Súper garras
- Personalidad: Feroz / Amigable / Veloz / Sigiloso

## Frontend — Componentes

- `App` — estado global del flujo (atributos, nombre del descubridor, resultado, loading/error)
- `AttributeSelector` — 5 grupos de botones, uno por categoría
- `DiscovererForm` — input del nombre del niño/a
- `DiscoverButton` — deshabilitado si falta algún atributo o el nombre; dispara `POST /api/generate-dino`
- `LoadingDino` — animación divertida durante la generación
- `ResultScreen` — imagen + nombre científico + nombre común + descripción + preview del certificado
- `EmailGateModal` — pide email antes de descargar, valida formato, guarda en `localStorage` (`dino_discovery_emails`), dispara la descarga
- `Certificate` — renderizado off-screen, capturado con html2canvas para generar el PNG

No se usa una librería de estado global: el flujo es lineal y el estado vive en `App`.

## Contrato del endpoint

`POST /api/generate-dino`

Request:
```json
{
  "size": "Gigante",
  "habitat": "Volcán",
  "diet": "Carnívoro",
  "feature": "Cuernos",
  "personality": "Feroz",
  "discovererName": "Lucía"
}
```

Response (200):
```json
{
  "scientificName": "...",
  "commonName": "...",
  "description": "...",
  "imageUrl": "/images/<cacheKey>.png"
}
```

Errores:
- `429` → `{ "error": "RATE_LIMITED", "retryAfterSeconds": N }`
- `502` → `{ "error": "API_ERROR", "message": "..." }` (mensaje genérico, sin detalles internos de Anthropic/OpenAI)

## Lógica del Worker

1. Obtener IP (`CF-Connecting-IP`)
2. Comprobar `RATE_LIMIT_KV[ip]`: si ≥5 en la última hora → 429. El contador se incrementa también en cache hits (decisión MVP: simple, evita afinar lógica de qué cuenta o no).
3. Calcular `cacheKey` = hash determinista de `{size, habitat, diet, feature, personality}` (el nombre del descubridor NO forma parte del hash, para que combinaciones repetidas de distintos niños compartan cache)
4. Buscar `cacheKey` en `CACHE_KV`:
   - **HIT** → responder con el resultado guardado (imagen servida desde R2 vía `/images/:key`)
   - **MISS** → continuar
5. Llamar a Anthropic (`claude-haiku-4-5`) con prompt construido a partir de los 5 atributos → parsear respuesta a `{ scientificName, commonName, description }`
6. Llamar a OpenAI (`dall-e-3`, standard, 1024x1024) con prompt construido a partir de los mismos atributos → URL temporal de imagen
7. Descargar la imagen y subirla a R2 con key `<cacheKey>.png`
8. Guardar en `CACHE_KV`: `{ scientificName, commonName, description, imageKey: cacheKey }`
9. Responder al cliente

Ruta auxiliar `GET /images/:key` sirve el binario desde R2.

## Certificado

Componente `Certificate`, capturado off-screen con html2canvas → PNG descargable (`certificado-<nombreComun>.png`):
- Borde decorativo tipo diploma
- Título "Certificado Oficial de Descubrimiento"
- "Descubridor/a Oficial: [nombre del niño/a]"
- Nombre científico (cursiva) + nombre común
- Imagen del dinosaurio
- Fecha de descubrimiento (fecha actual)
- Sello/badge decorativo (SVG)

## Email gate

1. Clic en "Descargar certificado" → abre `EmailGateModal`
2. Validación básica de formato de email (inline, sin `alert()`)
3. Al confirmar: guarda el email en `localStorage` (array `dino_discovery_emails`), cierra el modal
4. Ejecuta la captura con html2canvas y descarga el PNG

No hay backend para los emails en el MVP — solo persistencia local en el navegador.

## Manejo de errores (frontend)

- Atributos incompletos o nombre vacío → botón de generar deshabilitado, sin llamada a API
- 429 (rate limit) → mensaje amigable con cuenta atrás en minutos hasta poder reintentar
- 502 (fallo de Anthropic/OpenAI) → mensaje "¡El dinosaurio se escapó! Inténtalo de nuevo" + botón de reintentar, sin perder la selección de atributos
- Email inválido en el gate → validación inline

## Configuración / despliegue

- `wrangler.jsonc` define bindings: `RATE_LIMIT_KV`, `CACHE_KV`, `DINO_IMAGES` (R2), `compatibility_date` actual, `nodejs_compat`
- Secrets vía `wrangler secret put ANTHROPIC_API_KEY` / `OPENAI_API_KEY` — nunca en el repo ni en variables `VITE_*`
- Frontend desplegado en Cloudflare Pages; llama al Worker como API (mismo dominio o subdominio, sin problema de CORS si se configura igual zona)

## Fuera de alcance (MVP)

- Backend de emails (CRM, newsletters, etc.) — solo localStorage
- Exportación a PDF (se deja PNG como único formato)
- Tests E2E automatizados
- Autenticación de usuarios / historial de dinosaurios descubiertos
