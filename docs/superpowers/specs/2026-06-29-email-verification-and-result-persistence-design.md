# Persistencia de resultados y captura de email — diseño

Aborda en conjunto los puntos 1 y 4 de `docs/future-features.md` (persistencia real de emails y persistencia de resultados). El punto 2 (verificación de email antes de entregar el certificado) se descarta deliberadamente: la fricción de bloquear la descarga hasta confirmar no compensa, sobre todo dado que Kit en plan gratuito no ofrece ningún mecanismo cómodo de notificarnos la confirmación (ver "Decisiones descartadas" más abajo). En su lugar, se prioriza no perder ningún lead por fricción, aceptando que parte de los emails capturados no serán contactables.

## Contexto

- El resultado de la generación (`GenerateDinoResponse`) vivía solo en el estado de React (`App.tsx`); al refrescar la página se perdía.
- `src/emailStore.ts` guardaba el email en `localStorage` sin validarlo más allá del formato. No había captura de leads real.
- El backend (Cloudflare Pages Functions) ya usa KV (`RATE_LIMIT_KV`, `CACHE_KV`) y R2 (`DINO_IMAGES`) para cachear generaciones.
- El usuario tiene una cuenta en Kit (antes ConvertKit), que se usa como única fuente de verdad de leads/suscriptores (no se construye una lista propia).

## Decisiones de diseño

- **Lista de leads**: vive **solo en Kit**. No se persiste una lista propia de emails con fines de marketing; el campo `email` en nuestro KV es solo informativo/de depuración por resultado, no un CRM paralelo.
- **Sin bloqueo de descarga**: el certificado se entrega siempre al instante tras introducir el email. La suscripción a Kit (con su double opt-in nativo) se dispara en paralelo, **best-effort**: si falla (red, rate limit, Kit caído), la descarga no se ve afectada. Kit decide igualmente, por su cuenta y sin que nuestro código dependa de ello, si ese contacto recibirá comunicaciones de marketing (solo los confirmados las reciben — comportamiento nativo de Kit).
- **Visibilidad del link de resultado**: `/r/:resultId` es público y visible siempre (nombre, descripción, imagen) — es contenido para compartir, no un dato sensible.

## Decisiones descartadas (y por qué)

Antes de llegar al diseño final se intentaron, en orden, dos mecanismos para bloquear la descarga hasta confirmar el email — ambos descartados:

1. **Automatización de Kit con webhook** ("Subscribes to Form" → "Send a webhook"): es una función de plan de pago en Kit, no disponible.
2. **Redirección post-confirmación con datos dinámicos**: ni los Liquid tags de custom fields (`{{ subscriber.dino_result_id }}`) ni el checkbox "Send subscriber data to thank you page" funcionan en el campo "After confirming redirect to" de un formulario — ese campo es una URL estática, confirmado empíricamente en producción. Kit no tiene ninguna forma, en el plan gratuito, de pasarnos qué subscriber confirmó a través de esa redirección.

Se evaluó una tercera opción técnicamente viable (consultar `GET /v4/subscribers?email_address=` desde el backend en cada poll para saber si el email ya está `active`) que sí funcionaba sin necesitar webhook ni plan de pago — pero implicaba mantener una pantalla de espera con polling que añadía fricción real para un beneficio marginal (filtrar emails no contactables). Se descartó en favor de no bloquear nunca la descarga.

## Arquitectura

### 1. Persistencia de resultados

KV namespace `RESULTS_KV`. Al generar un dino con éxito en `functions/api/generate-dino.ts`, se crea un registro indexado por un `resultId` (UUID v4) nuevo en cada generación:

```ts
interface ResultRecord {
  scientificName: string;
  commonName: string;
  description: string;
  imageKey: string;
  discovererName: string;
  attrs: DinoAttributes;
  createdAt: number;
  email: string | null;
}
```

Key: `result:{resultId}`. TTL: 90 días.

`generate-dino.ts` devuelve `resultId` junto a la respuesta existente (`GenerateDinoResponse & { resultId: string }`).

`GET /api/results/:id` (`functions/api/results/[id].ts`) devuelve `{ scientificName, commonName, description, imageUrl, discovererName }` (sin exponer el email) o 404 si no existe/expiró.

Frontend (`App.tsx`):
- Al recibir `resultId`, hace `history.pushState(null, '', /r/${resultId})`.
- Al cargar la app, si la ruta es `/r/:id`, llama a `GET /api/results/:id` para reconstruir el estado de `ResultScreen` directamente. Cubre tanto el refresco como el link compartido. Sin librería de routing — basta con parsear `window.location.pathname`.

### 2. Captura de email (best-effort, sin bloqueo)

`POST /api/subscribe` (`functions/api/subscribe.ts`):
- Body `{ resultId, email }`.
- Valida formato de email y que `resultId` exista en `RESULTS_KV`.
- Rate limit por IP (mismo patrón que `generate-dino`, prefijo `subscribe:{ip}`).
- Llama a `subscribeToKitForm` (`functions/lib/kit.ts`), un proceso de dos llamadas a la API v4 de Kit: `POST /v4/subscribers` (crea/actualiza el subscriber, con el custom field `dino_result_id` como metadato útil para depurar en el dashboard) y `POST /v4/forms/{form_id}/subscribers/{subscriber_id}` (lo añade a ese formulario, disparando su double opt-in).
- Si todo va bien, guarda `email` en el `ResultRecord`.
- Si Kit falla → 502, pero el frontend lo ignora silenciosamente (ver abajo).

Frontend (`EmailGateModal.tsx` y `App.tsx`):
- `EmailGateModal` es un formulario simple: pide el email, valida formato, llama a `onConfirm(email)`.
- `App.handleEmailConfirm`: cierra el modal, llama a `subscribeEmail` envuelto en `try/catch` (cualquier error se descarta sin mostrar nada al usuario), y siempre descarga el certificado a continuación.

### 3. Persistencia de emails

No se crea una tabla/lista propia de leads. Kit es la fuente de verdad. El único dato de email que tocamos es el campo `email` dentro de `ResultRecord`, informativo, sin lógica de negocio asociada.

## Variables de entorno

Secrets de Cloudflare Pages: `KIT_API_KEY`, `KIT_FORM_ID`. (`KIT_WEBHOOK_SECRET` se configuró para el mecanismo de webhook descartado y ya no se usa; se puede eliminar.)

`wrangler.jsonc`: `{ "binding": "RESULTS_KV", "id": "1468c8a5db784d9bbdcbbafa2d084737" }`.

## Manejo de errores

- Fallo al llamar a la API de Kit en `/api/subscribe` → no afecta a la descarga del certificado; se loguea en el backend (`console.error`) para depuración, pero el frontend no lo muestra al usuario.
- `resultId` no encontrado/expirado en `GET /api/results/:id` → 404; el frontend muestra "Este descubrimiento ya no está disponible".

## Testing

- Unit tests para `functions/lib/results.ts`, `functions/lib/kit.ts`, `functions/api/generate-dino.ts`, `functions/api/results/[id].ts`, `functions/api/subscribe.ts`.
- Tests de `EmailGateModal` (formulario simple) y `App.tsx` (carga desde `/r/:id`, descarga inmediata, descarga incluso si `subscribeEmail` falla).

## Fuera de alcance

- Verificación real de que el email es contactable (descartada, ver "Decisiones descartadas").
- Link compartible "bonito" con preview social (OG tags dinámicas) — continuación del punto 6 de `future-features.md`.
- Cualquier UI/gestión de leads dentro de nuestra app — vive en el dashboard de Kit.
- Migración de los emails ya guardados en `localStorage` de usuarios existentes.
