# Futura funcionalidad a revisar

Recopilación de mejoras propuestas para iterar sobre el MVP del Dino Discovery. Ordenadas de más a menos críticas. Ninguna está aprobada para implementación — esta lista es para estudiar y priorizar.

## Críticas (bloquean fiabilidad/uso real)

1. **Persistencia real de emails** — hoy se guardan solo en `localStorage`; se pierden al cambiar de dispositivo/navegador o borrar datos. Sin esto no hay captura de leads real.
2. **Verificación del email antes de entregar el certificado** — hoy cualquier email, incluso uno inventado/dummy, desbloquea la descarga inmediatamente; no hay verificación real (confirmación por link, código OTP, etc.). Sin esto, la captura de leads del punto 1 recoge en buena parte direcciones no contactables/falsas, lo que invalida gran parte del valor de pedir el email.
3. **Manejo de errores de generación visible al usuario** — si Claude/DALL-E fallan o se agota el rate limit (5/h/IP), no hay un estado de error claro para el niño/usuario.
4. **Persistencia de resultados** — si se refresca la página tras generar, se pierde el dinosaurio. Debería poder recuperarse o compartirse por URL.
5. **Adaptación mobile** — revisar tamaños táctiles, layout y legibilidad en pantallas pequeñas. La app está pensada para niños usando tablets/móviles, por lo que una mala experiencia mobile bloquea el uso real del producto.

## Importantes (mejoran la experiencia central)

6. **Compartir el dinosaurio** (link o imagen para redes/WhatsApp) — falta el "viral loop" natural de este tipo de producto.
7. **Mejorar la pantalla de carga (`LoadingDino`)**:
   - Animación del huevo rompiéndose por fases (sin emojis, ilustración/SVG propia).
   - Barra de progreso en la parte inferior.
   - Mensajes progresivos si la generación tarda (DALL-E puede tardar 10-20s) para que no parezca colgado.
8. **"Mi colección"** — que el niño pueda acceder a sus dinosaurios descubiertos anteriormente (requiere resolver primero la persistencia de resultados, punto 4).
9. **Sonidos** al hacer click en las opciones del wizard (atributos, botones).
10. **Transiciones y animaciones** entre pantallas del wizard (más allá del auto-advance actual).
11. **Confeti al descubrir el dinosaurio** — animación de confeti en `ResultScreen` cuando se revela el dino generado, para reforzar el momento de "descubrimiento" y el engagement.
12. **Accesibilidad básica** (foco, contraste, navegación por teclado) — pensado para niños, posiblemente usado en tablets/coles.
13. **Navegación tras ver el resultado** — en `ResultScreen` no hay forma de volver atrás ni empezar de nuevo salvo refrescando la página. Falta un botón de "Crear otro dinosaurio" / "Volver" que reinicie el wizard sin recargar.
14. **Elección de color del dino** — añadir un paso/atributo donde el niño elija un color y el dinosaurio generado lo refleje mayoritariamente (requiere ajustar el prompt de generación de imagen para respetar el color elegido).
15. **Nuevo atributo de dieta: comedor de huevos** — añadir una opción de dieta para dinosaurios que se alimentan de huevos de otras especies. Nota de terminología: el término correcto sería "ovívoro" (se alimenta de huevos), no "ovíparo" (pone huevos) — todos los dinosaurios son ovíparos, así que ese término no distinguiría nada como atributo de dieta; conviene revisar el nombre exacto antes de implementarlo.
16. **Quitar el fondo blanco de las imágenes generadas** — actualmente todos los dinosaurios se generan sobre un fondo blanco liso. Probar fondo transparente, o un fondo que se mimetice con la paleta oscura/lima de la app, para que el resultado se sienta más integrado visualmente con el resto de la experiencia (requiere ajustar el prompt de generación de imagen).
17. **Contextualizar visualmente a cada dinosaurio en su hábitat** — de momento solo el hábitat "Volcán" muestra al dinosaurio dentro de su entorno (con un volcán de fondo); el resto de hábitats se genera sin ambientación. Por ejemplo, "Océano" debería mostrar al dinosaurio bajo el agua, "Desierto" entre dunas, etc. Requiere reforzar el prompt de generación de imagen para que el hábitat seleccionado forme parte de la escena, no solo se mencione como atributo del dinosaurio.

## Deseables (pulido y crecimiento)

18. **Exportar a PDF** además de PNG — explícitamente fuera de alcance del MVP original, pero muy pedido en este tipo de producto.
19. **Analítica básica** (cuántos completan el wizard, en qué paso abandonan) — necesario para saber qué iterar después.
20. **Tests E2E** — explícitamente fuera del MVP; útil antes de escalar tráfico pero no bloquea el lanzamiento.

## Notas

- El punto 8 ("Mi colección") depende de resolver primero el punto 4 (persistencia de resultados) y posiblemente el 1 (persistencia de emails), ya que ambos requieren guardar datos más allá de la sesión actual.
- El punto 2 (verificación de email) depende del punto 1 (persistencia real de emails): verificar un email que solo vive en `localStorage` tiene un valor limitado, conviene abordarlos juntos.
- Los puntos 16 y 17 son ambos ajustes del prompt de generación de imagen — tiene sentido abordarlos juntos en la misma iteración.
- Antes de implementar cualquiera de estos puntos, pasar por el proceso de brainstorming/diseño habitual.