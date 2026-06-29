# Futura funcionalidad a revisar

Recopilación de mejoras propuestas para iterar sobre el MVP del Dino Discovery. Ordenadas de más a menos críticas. Ninguna está aprobada para implementación — esta lista es para estudiar y priorizar.

## Críticas (bloquean fiabilidad/uso real)

1. **Persistencia real de emails** — hoy se guardan solo en `localStorage`; se pierden al cambiar de dispositivo/navegador o borrar datos. Sin esto no hay captura de leads real.
2. **Verificación del email antes de entregar el certificado** — hoy cualquier email, incluso uno inventado/dummy, desbloquea la descarga inmediatamente; no hay verificación real (confirmación por link, código OTP, etc.). Sin esto, la captura de leads del punto 1 recoge en buena parte direcciones no contactables/falsas, lo que invalida gran parte del valor de pedir el email.
3. ✅ **Manejo de errores de generación visible al usuario** — implementado: pantalla de error dedicada (`flowState: 'error'` en `App.tsx`) con mensaje específico para rate limit vs. fallo de API, y botón "Volver a intentar".
4. **Persistencia de resultados** — si se refresca la página tras generar, se pierde el dinosaurio. Debería poder recuperarse o compartirse por URL.
5. ✅ **Adaptación mobile** — implementado (commit `41e27cb`): touch targets de 44px, layout y legibilidad ajustados a 320px en Landing, WizardShell, AttributeGroup, EmailGateModal, NameStep y ResultScreen.

## Importantes (mejoran la experiencia central)

6. 🟡 **Compartir el dinosaurio** (link o imagen para redes/WhatsApp) — parcialmente implementado: botón "Compartir dinosaurio" en `ResultScreen` que comparte la imagen generada vía Web Share API (fallback a descarga). Sigue faltando el link compartible persistente (bloqueado por el punto 4).
7. **Mejorar la pantalla de carga (`LoadingDino`)**:
   - Animación del huevo rompiéndose por fases (sin emojis, ilustración/SVG propia).
   - Barra de progreso en la parte inferior.
   - Mensajes progresivos si la generación tarda (DALL-E puede tardar 10-20s) para que no parezca colgado.
8. **"Mi colección"** — que el niño pueda acceder a sus dinosaurios descubiertos anteriormente (requiere resolver primero la persistencia de resultados, punto 4).
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

- El punto 8 ("Mi colección") depende de resolver primero el punto 4 (persistencia de resultados) y posiblemente el 1 (persistencia de emails), ya que ambos requieren guardar datos más allá de la sesión actual.
- El punto 2 (verificación de email) depende del punto 1 (persistencia real de emails): verificar un email que solo vive en `localStorage` tiene un valor limitado, conviene abordarlos juntos.
- El punto 17 sigue pendiente y ahora está desacoplado del 16: una escena contextual por hábitat necesita su propio fondo, incompatible con el fondo sólido fijo que implementa el punto 16.
- Antes de implementar cualquiera de estos puntos, pasar por el proceso de brainstorming/diseño habitual.
- Puntos 3, 5, 9, 11 y 13 (y parcialmente el 6) entregados en la release v0.2.3.