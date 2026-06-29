# Fondo sólido a juego en la imagen generada del dino (punto 16 de future-features.md)

## Goal

Sustituir el fondo blanco liso de las imágenes generadas por gpt-image-2 por un color sólido que combine con el tema oscuro/lima de la app, para que el resultado se sienta integrado en vez de una pegatina sobre blanco.

## Decisión de alcance (resuelta durante el diseño)

El doc original mezclaba dos ideas contradictorias: #16 (quitar fondo blanco, transparente o tintado) y #17 (escena contextual por hábitat — Océano bajo el agua, Desierto entre dunas, etc.). Una escena real necesita su propio fondo; no puede ser transparente ni un color plano a la vez. Se decidió explícitamente:

- **Se prioriza #16.** No se implementa #17 en esta iteración — ningún hábitat recibe una escena ilustrada nueva.
- **Color sólido, no transparencia real.** gpt-image-2 rechaza el parámetro `background: transparent` (probado y confirmado: `400 Transparent background is not supported for this model`). Conseguir transparencia real exigiría post-procesado de píxeles dentro de la Cloudflare Pages Function (decodificar PNG, recalcular canal alpha, re-codificar) — no hay Node.js/`sharp` disponible en el runtime de Workers, así que sería una librería WASM nueva, más latencia por petición y más superficie de fallo. Se descarta por desproporcionado frente al beneficio.
- **"Volcán" se deja como excepción.** Hoy ese hábitat ya tiende a salir con una escena de fondo (lava, roca) aunque el prompt pida fondo blanco — el modelo ignora la instrucción para esa palabra concreta. No se fuerza a que pierda ese comportamiento; no se añade tampoco énfasis nuevo para conseguirlo en el resto de hábitats.

## Cambio de prompt

En `functions/lib/openai.ts`, función `generateDinoImage`, se sustituye únicamente la cláusula de fondo:

- Antes: `..., no text, no watermark, white background.`
- Después: `..., no text, no watermark, solid background color #0d1a0f.`

`#0d1a0f` es el token `bg` de `tailwind.config.js` — el verde oscuro principal de la app, el mismo que usa la tarjeta del `Certificate.tsx` (`bg-bg`). Nada más del prompt cambia: tamaño, hábitat (como atributo descriptivo, no como instrucción de escena), dieta, característica y personalidad siguen igual.

No se toca `src/components/ResultScreen.tsx` ni `src/components/Certificate.tsx` — sus contenedores ya usan colores muy próximos (`bg-surface2` `#0f2a0f` y `bg-bg` `#0d1a0f` respectivamente) y la imagen es cuadrada con `object-contain` dentro de un contenedor cuadrado, así que no hay huecos donde se note la pequeña diferencia entre ambos verdes.

## Invalidación de caché

`functions/api/generate-dino.ts` cachea cada combinación de atributos en `CACHE_KV` sin expiración (`functions/lib/cache.ts`). Sin invalidar, cualquier combinación ya generada en producción seguiría devolviendo para siempre la imagen vieja con fondo blanco.

En `functions/lib/hash.ts`, `computeCacheKey` añade un literal de versión al array que se concatena antes de hashear:

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

Esto invalida toda la caché existente: la próxima vez que se pida cualquier combinación ya usada, se genera de cero (con coste de API real) y se cachea con la clave nueva. Coste aceptado explícitamente por el usuario.

## Testing

- `functions/lib/openai.test.ts`: añadir una aserción sobre el cuerpo de la petición enviada a OpenAI, comprobando que el prompt contiene `solid background color #0d1a0f` y ya no contiene `white background`.
- `functions/lib/hash.test.ts`: los tests existentes (mismos atributos → mismo hash; atributo distinto → hash distinto; longitud 64 hex) siguen pasando sin cambios, ya que no fijan un valor de hash concreto — solo verifican propiedades relativas.
- No se necesita ningún test nuevo para la invalidación en sí (es un efecto de cambiar el input del hash, ya cubierto por los tests existentes de `computeCacheKey`).

## Out of scope

- No se implementa contextualización de hábitat (punto 17) — queda pendiente como posible iteración futura, ahora claramente desacoplada de este cambio.
- No se purga manualmente el `CACHE_KV` de Cloudflare — la invalidación es "lógica" (vía el sufijo de versión en la clave), no se borran las entradas viejas, simplemente quedan huérfanas y dejan de leerse.
- No se cambia `functions/lib/anthropic.ts` (texto/nombre/descripción) — esto es puramente sobre la imagen.
