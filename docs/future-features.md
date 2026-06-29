# Futura funcionalidad a revisar

Recopilación de mejoras propuestas para iterar sobre el MVP del Dino Discovery. Ordenadas de más a menos críticas. Ninguna está aprobada para implementación — esta lista es para estudiar y priorizar.

## Críticas (bloquean fiabilidad/uso real)

1. ✅ **Persistencia real de emails** — implementado: el email ya no se guarda en `localStorage`; Kit (vía `POST /api/subscribe`) es la única fuente de verdad de leads/suscriptores. Ver `docs/superpowers/specs/2026-06-29-email-verification-and-result-persistence-design.md`.
2. ❌ **Verificación del email antes de entregar el certificado** — descartado deliberadamente tras intentarlo: Kit no ofrece (en plan gratuito) ninguna forma fiable de notificarnos la confirmación sin mantener una pantalla de espera con polling, y la fricción de bloquear la descarga no compensaba frente al riesgo de perder leads. Se prioriza no bloquear nunca la descarga; el email se sigue capturando y enviando a Kit (punto 1), solo que sin gating. Ver "Decisiones descartadas" en `docs/superpowers/specs/2026-06-29-email-verification-and-result-persistence-design.md`.
3. ✅ **Manejo de errores de generación visible al usuario** — implementado: pantalla de error dedicada (`flowState: 'error'` en `App.tsx`) con mensaje específico para rate limit vs. fallo de API, y botón "Volver a intentar".
4. ✅ **Persistencia de resultados** — implementado: cada descubrimiento se guarda en `RESULTS_KV` con un `resultId` propio, accesible y recuperable vía `/r/:resultId` (`GET /api/results/:id`), sobreviviendo a refrescos y compartible por URL.
5. ✅ **Adaptación mobile** — implementado (commit `41e27cb`): touch targets de 44px, layout y legibilidad ajustados a 320px en Landing, WizardShell, AttributeGroup, EmailGateModal, NameStep y ResultScreen.

## Importantes (mejoran la experiencia central)

6. 🟡 **Compartir el dinosaurio** (link o imagen para redes/WhatsApp) — parcialmente implementado: botón "Compartir dinosaurio" en `ResultScreen` que comparte la imagen generada vía Web Share API (fallback a descarga). El punto 4 (bloqueante) ya está resuelto — existe un link persistente `/r/:resultId` — pero el botón de compartir todavía no lo usa; sigue compartiendo solo la imagen suelta.
7. **Mejorar la pantalla de carga (`LoadingDino`)**:
   - Animación del huevo rompiéndose por fases (sin emojis, ilustración/SVG propia).
   - Barra de progreso en la parte inferior.
   - Mensajes progresivos si la generación tarda (DALL-E puede tardar 10-20s) para que no parezca colgado.
8. **"Mi colección"** — que el niño pueda acceder a sus dinosaurios descubiertos anteriormente (la persistencia de resultados del punto 4 ya está resuelta; falta construir la propia vista de colección).
9. ✅ **Sonidos** al hacer click en las opciones del wizard (atributos, botones) — implementado con un click sintetizado vía Web Audio API (sin assets de audio).
10. **Transiciones y animaciones** entre pantallas del wizard (más allá del auto-advance actual).
11. ✅ **Confeti al descubrir el dinosaurio** — implementado: animación de confeti en `ResultScreen` al revelar el dino generado.
12. **Accesibilidad básica** (foco, contraste, navegación por teclado) — pensado para niños, posiblemente usado en tablets/coles.
13. ✅ **Navegación tras ver el resultado** — implementado: botón "Crear otro dinosaurio" en `ResultScreen` que reinicia el wizard sin recargar la página.
14. **Elección de color del dino** — añadir un paso/atributo donde el niño elija un color y el dinosaurio generado lo refleje mayoritariamente (requiere ajustar el prompt de generación de imagen para respetar el color elegido).
15. **Nuevo atributo de dieta: comedor de huevos** — añadir una opción de dieta para dinosaurios que se alimentan de huevos de otras especies. Nota de terminología: el término correcto sería "ovívoro" (se alimenta de huevos); conviene revisar el nombre exacto antes de implementarlo.
16. ✅ **Quitar el fondo blanco de las imágenes generadas** — implementado: el prompt de `gpt-image-2` ahora pide un fondo sólido `#0d1a0f` (verde oscuro de la app) en vez de blanco. No es transparencia real (gpt-image-2 no la soporta) ni una escena contextual (eso queda como punto 17, sin implementar).
17. **Contextualizar visualmente a cada dinosaurio en su hábitat** — de momento solo el hábitat "Volcán" muestra al dinosaurio dentro de su entorno (con un volcán de fondo); el resto de hábitats se genera sin ambientación. Por ejemplo, "Océano" debería mostrar al dinosaurio bajo el agua, "Desierto" entre dunas, etc. Requiere reforzar el prompt de generación de imagen para que el hábitat seleccionado forme parte de la escena, no solo se mencione como atributo del dinosaurio.

## Deseables (pulido y crecimiento)

18. **Exportar a PDF** además de PNG — explícitamente fuera de alcance del MVP original, pero muy pedido en este tipo de producto.
19. **Analítica básica** (cuántos completan el wizard, en qué paso abandonan) — necesario para saber qué iterar después.
20. **Tests E2E** — explícitamente fuera del MVP; útil antes de escalar tráfico pero no bloquea el lanzamiento.

## Notas

- Los puntos 1 y 4 se implementaron juntos usando Kit como proveedor de email marketing; ver `docs/superpowers/specs/2026-06-29-email-verification-and-result-persistence-design.md`. El punto 2 se evaluó y se descartó deliberadamente (ver esa misma spec) en favor de no bloquear nunca la descarga del certificado.
- El punto 8 ("Mi colección") ya tiene resuelta su dependencia de datos (punto 4); falta construir la vista de colección en sí.
- El punto 17 sigue pendiente y ahora está desacoplado del 16: una escena contextual por hábitat necesita su propio fondo, incompatible con el fondo sólido fijo que implementa el punto 16.
- Antes de implementar cualquiera de estos puntos, pasar por el proceso de brainstorming/diseño habitual.
- Puntos 3, 5, 9, 11 y 13 (y parcialmente el 6) entregados en la release v0.2.3. Puntos 1, 2 y 4 entregados posteriormente (ver commit "Add real result persistence and email verification via Kit").