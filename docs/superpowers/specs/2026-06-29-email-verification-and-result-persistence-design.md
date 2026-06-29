# Verificación de email y persistencia de resultados — diseño

Aborda en conjunto los puntos 1, 2 y 4 de `docs/future-features.md` (persistencia real de emails, verificación de email antes de entregar el certificado, persistencia de resultados), ya que el propio documento señala que están interdependientes.

## Contexto

Hoy:
- `src/emailStore.ts` guarda el email del usuario en `localStorage` sin validarlo más allá del formato (`isValidEmail`). Cualquier email inventado desbloquea la descarga inmediata del certificado.
- El resultado de la generación (`GenerateDinoResponse`) vive solo en el estado de React (`App.tsx`); al refrescar la página se pierde.
- El backend (Cloudflare Pages Functions) ya usa dos KV namespaces (`RATE_LIMIT_KV`, `CACHE_KV`) y un bucket R2 (`DINO_IMAGES`) para cachear generaciones por combinación de atributos.
- El usuario tiene una cuenta en Kit (antes ConvertKit), que se usará como única fuente de verdad de leads/suscriptores (no se construye una lista propia).

## Decisiones de diseño

- **Verificación**: double opt-in nativo de Kit (no OTP propio). Kit gestiona el envío y la confirmación del email.
- **Momento de desbloqueo**: la descarga del certificado queda **bloqueada hasta que el email se confirme** en Kit.
- **Lista de leads**: vive **solo en Kit**. No se persiste una lista propia de emails; el dato de email en nuestro KV es únicamente estado transitorio de gating (saber si *este resultado concreto* fue confirmado), no un CRM paralelo.
- **Espera de confirmación**: pantalla de espera con **polling automático** (sin botón manual) — el frontend consulta el estado cada pocos segundos y desbloquea la descarga en cuanto detecta la confirmación.
- **Visibilidad del link de resultado**: `/r/:resultId` es **público y visible siempre** (nombre, descripción, imagen), confirmado o no — es contenido para compartir, no un dato sensible. Solo la descarga del certificado PNG depende de la confirmación del email de quien lo generó.

## Arquitectura

### 1. Persistencia de resultados (resuelve punto 4)

Nuevo KV namespace `RESULTS_KV`. Al generar un dino con éxito en `functions/api/generate-dino.ts`, además del cacheo existente por combinación de atributos, se crea un registro indexado por un `resultId` (UUID v4) nuevo en cada generación (aunque el contenido del dino esté cacheado, cada "descubrimiento" de un niño es una entidad propia):

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
  emailConfirmed: boolean;
}
```

Key: `result:{resultId}`. TTL: 90 días (`expirationTtl`) — suficiente para compartir/recuperar sin acumular datos indefinidamente.

`generate-dino.ts` devuelve `resultId` junto a la respuesta existente (`GenerateDinoResponse & { resultId: string }`).

Nuevo endpoint `functions/api/results/[id].ts`:
- `GET /api/results/:id` → devuelve `{ scientificName, commonName, description, imageUrl, discovererName, emailConfirmed }` (sin exponer el email) o 404 si no existe/expiró.

Frontend (`App.tsx`):
- Al recibir `resultId`, hace `history.pushState(null, '', /r/${resultId})`.
- Al cargar la app, si la ruta es `/r/:id`, llama a `GET /api/results/:id` para reconstruir el estado de `ResultScreen` directamente (sin pasar por el wizard). Esto cubre tanto el refresco como el link compartido. No se introduce una librería de routing — basta con parsear `window.location.pathname` dado que solo hay esta ruta adicional.

### 2. Verificación de email y bloqueo de descarga (resuelve punto 2)

Nuevo endpoint `functions/api/subscribe.ts`:
- `POST /api/subscribe { resultId, email }`.
- Valida formato de email (reutiliza `isValidEmail`) y que `resultId` exista en `RESULTS_KV`.
- Rate limit por IP reutilizando `checkAndIncrementRateLimit` (mismo patrón que `generate-dino`, namespace `RATE_LIMIT_KV`, prefijo distinto p.ej. `subscribe:{ip}`).
- Llama a la API v4 de Kit: `POST https://api.kit.com/v4/forms/{KIT_FORM_ID}/subscribers` con header `X-Kit-Api-Key` y body `{ email_address: email, fields: { dino_result_id: resultId } }`. Esto crea/actualiza el suscriptor en Kit y dispara su email de confirmación double opt-in.
- Actualiza el registro `result:{resultId}` en KV: `email = email`, `emailConfirmed = false` (no se sobrescribe si ya estaba confirmado, por si reenvía el formulario).
- Responde `200 { ok: true }` o error si la llamada a Kit falla.

**Actualización**: las automatizaciones con webhook de Kit ("Visual Automations") son una función de plan de pago. Se sustituyen por un mecanismo igual de eficaz pero disponible en el plan gratuito: la redirección post-confirmación del propio formulario, usando Liquid tags.

**Segunda corrección**: los Liquid tags de custom fields no se renderizan en el campo "Redirect to URL" de un formulario, y el checkbox "Send subscriber data to thank you page" solo aplica al redirect de suscripción normal (tab "General"), no al de "After confirming redirect to" (tab "Confirmation email") — confirmado empíricamente: ese campo es una URL estática sin ningún dato dinámico añadido por Kit. No hay ninguna forma de que Kit nos pase el `resultId` ni el email a través de esa redirección en el plan gratuito.

**Diseño final**: en vez de depender de qué le pasa Kit al navegador tras confirmar, el propio backend **consulta la API de Kit para preguntar si el email ya está confirmado**, cada vez que el frontend hace polling. Esto no necesita redirect, webhook ni automatización — solo lecturas de la API v4, disponibles en el plan gratuito, y funciona aunque el usuario confirme desde otro dispositivo sin volver nunca a la web.

- `functions/lib/kit.ts` añade `isEmailConfirmed(email, config)`: `GET /v4/subscribers?email_address={email}` (por defecto Kit filtra a `state=active`); devuelve `true` si la respuesta incluye al menos un subscriber.
- `functions/api/results/[id].ts` (el mismo endpoint que ya usaba el polling) se actualiza: si `record.emailConfirmed` es `false` y `record.email` no es null, llama a `isEmailConfirmed`; si es `true`, marca el `ResultRecord` como confirmado en KV antes de responder. Si ya estaba confirmado o no hay email todavía, no llama a Kit (evita peticiones innecesarias).
- Se elimina `functions/api/confirm.ts` y el índice `pending-email:{email}` en KV — ya no son necesarios.

**Configuración en Kit**: con este diseño, el campo "After confirming redirect to: URL" puede ser cualquier página (la de por defecto de Kit, o la home de la app) — no transporta ningún dato y no es parte de la lógica de confirmación.

La suscripción en sí (`functions/lib/kit.ts`, sin cambios) sigue siendo un proceso de dos llamadas a la API v4: `POST /v4/subscribers` (crea/actualiza el subscriber, con el custom field `dino_result_id` como metadato útil para depurar en el dashboard de Kit aunque ya no se use programáticamente) y `POST /v4/forms/{form_id}/subscribers/{subscriber_id}` (lo añade a ese formulario, lo que dispara su email de doble confirmación).

Frontend (`EmailGateModal.tsx` y `App.tsx`):
- Al confirmar el email, en vez de `saveEmail` + descarga inmediata, se llama a `POST /api/subscribe`.
- El modal pasa a un estado "Revisa tu correo y confirma tu suscripción" (mensaje en español, tono niño/padre) mientras el dino generado sigue visible de fondo.
- `App.tsx` inicia un polling (`setInterval`, ~3s) a `GET /api/results/:id` mientras este estado esté activo. En cuanto `emailConfirmed === true`, se detiene el polling y se dispara automáticamente la captura/descarga del certificado (mismo `captureCertificateAsPng` ya existente).
- Si el usuario cierra el modal/pantalla de espera y vuelve más tarde (mismo link `/r/:id`), al reabrir "Descargar certificado" se vuelve a comprobar `emailConfirmed` antes de pedir el email de nuevo.

### 3. Persistencia de emails (resuelve punto 1)

No se crea una tabla/lista propia de leads. Kit es la fuente de verdad (su panel de suscriptores, segmentado por el form/tag usado). El único dato de email que tocamos nosotros es el campo transitorio `email` dentro de `ResultRecord`, exclusivamente para la lógica de gating descrita arriba.

## Variables de entorno nuevas

Añadidas como secrets de Cloudflare Pages (mismo patrón que `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`):
- `KIT_API_KEY`
- `KIT_FORM_ID`
- `KIT_WEBHOOK_SECRET`

`wrangler.jsonc` añade el nuevo binding:
```json
{ "binding": "RESULTS_KV", "id": "<por crear>" }
```

## Manejo de errores

- Fallo al llamar a la API de Kit en `/api/subscribe` → el modal muestra un mensaje de error y permite reintentar (mismo patrón visual que la pantalla de error de generación).
- `resultId` no encontrado/expirado en `GET /api/results/:id` → 404; el frontend muestra un estado "Este descubrimiento ya no está disponible" en vez de romper.
- Webhook con secreto inválido → 401, no se procesa.
- Webhook con `dino_result_id` que no existe en KV (registro expirado entre medias) → 200 no-op, se loguea.

## Testing

- Unit tests para `functions/api/subscribe.ts` (validación, llamada a Kit mockeada, actualización de KV) y `functions/api/webhooks/kit.ts` (verificación de secreto, actualización de `emailConfirmed`), siguiendo el patrón de mocks ya usado en `rateLimit.test.ts`/`cache.test.ts`.
- Unit tests para `functions/api/results/[id].ts`.
- Tests de `EmailGateModal` actualizados para el nuevo flujo de espera/polling.
- Tests de `App.tsx` para la reconstrucción de estado desde `/r/:id` y el flujo de polling hasta desbloqueo.

## Fuera de alcance

- Link compartible "bonito" con preview social (OG tags dinámicas) — eso es continuación del punto 6, no de este diseño.
- Cualquier UI/gestión de leads dentro de nuestra app — vive en el dashboard de Kit.
- Migración de los emails ya guardados en `localStorage` de usuarios existentes — el MVP no tenía persistencia real, se asume que no hay que migrar nada.
