# Landing + Wizard Flow — Design Spec (Fase A)

## Resumen

Rediseño de la fase de selección de atributos del Dino Discovery Generator: en vez de una única pantalla con las 5 categorías visibles a la vez, el flujo pasa por una **landing** inicial y un **wizard de 6 pantallas** (nombre + 5 rasgos, una por pantalla, con auto-avance). El resto del flujo (generación, resultado, certificado, email gate) no cambia.

Esta es la Fase A de un rediseño en dos fases. La Fase B (iconos por rasgo, animación de huevo por etapas, estilo visual definitivo) se diseñará en una sesión aparte; esta spec no la cubre.

## Flujo

```
Landing (logo + título + "¡Empezar!")
   │
   ▼
Wizard (6 pantallas, barra de progreso arriba, botón "Atrás" en todas excepto la 1ª):
   1. Nombre del descubridor/a (input + botón "Siguiente")
   2. Tamaño            (auto-avanza al elegir)
   3. Hábitat           (auto-avanza al elegir)
   4. Dieta             (auto-avanza al elegir)
   5. Característica especial (auto-avanza al elegir)
   6. Personalidad      (auto-avanza al elegir → dispara generación)
   │
   ▼
[flujo ya existente, sin cambios: Loading → Resultado → Email gate → Certificado]
```

## Landing

- Imagen grande generada con IA (gpt-image-2), estilo **cartoon amigable y redondeado**: dino sonriente, colores saturados (verde/morado/naranja), formas suaves. Ocupa buena parte de la pantalla, especialmente en móvil.
- Título: "Dino Discovery Generator" (nombre de trabajo, sustituible después sin afectar al diseño).
- Subtítulo corto: "¡Crea tu propio dinosaurio único!".
- Botón grande "¡Empezar!" — ancho, fácil de tocar en móvil — que navega a la pantalla 1 del wizard (nombre).

## Wizard — comportamiento común

- **Barra de progreso** horizontal en la parte superior de cada pantalla, rellena proporcionalmente al paso actual sobre 6 pantallas totales (ej. paso 2 de 6 → ~33%).
- **Botón "Atrás"** (flecha, esquina superior izquierda) presente en las pantallas 2-6. Vuelve a la pantalla anterior del wizard sin perder las selecciones ya hechas en pantallas posteriores si el usuario vuelve a avanzar.
- La pantalla 1 (nombre) no tiene botón "Atrás" hacia el wizard — su botón de retroceso vuelve a la **landing**.
- **Pantalla 1 (nombre):** input de texto + botón "Siguiente", habilitado solo cuando el campo no está vacío (tras `trim()`). No hay auto-avance aquí porque no hay una "opción" que pulsar — el usuario debe confirmar explícitamente.
- **Pantallas 2-6 (un rasgo cada una):** reutilizan el componente `AttributeGroup` ya existente (sin cambios), pero presentado a pantalla completa, una sola categoría visible. Al tocar una opción: breve confirmación visual de 500ms (el botón elegido se resalta) y luego avance automático a la siguiente pantalla.
- Al completar la pantalla 6 (Personalidad), el wizard dispara automáticamente la llamada a `generateDino` — no existe un botón final separado de "¡Descubrir mi dinosaurio!"; la propia selección del último rasgo es la acción que dispara la generación.

## Estado en App.tsx

El `FlowState` actual (`'idle' | 'loading' | 'result' | 'error'`) se sustituye por:

```ts
type FlowState = 'landing' | 'wizard' | 'loading' | 'result' | 'error';
```

Durante `'wizard'`, un índice de paso interno (`wizardStep: number`, 0-5) determina qué pantalla del wizard se muestra. Las 5 piezas de estado de atributos (`size`, `habitat`, etc.) y `discovererName` se mantienen igual que ahora — solo cambia cómo se recogen, no su forma.

## Manejo de errores

Sin cambios respecto al flujo actual: si `generateDino` falla (rate limit o error de API), se muestra la pantalla de error ya existente con el botón "Volver a intentar". Ese botón ahora resetea a `wizardStep: 0` dentro de `'wizard'` (no a `'landing'`), para no obligar a repetir el "¡Empezar!" tras un fallo de generación — las selecciones de atributos ya hechas se conservan.

## Componentes nuevos/modificados

- `src/components/Landing.tsx` (nuevo) — imagen, título, subtítulo, botón "¡Empezar!".
- `src/components/WizardShell.tsx` (nuevo) — envuelve cada paso del wizard con la barra de progreso y el botón "Atrás"; recibe el paso actual y el total como props.
- `src/components/NameStep.tsx` (nuevo) — input + botón "Siguiente" para la pantalla 1.
- `src/components/AttributeGroup.tsx` — **sin cambios**, se reutiliza tal cual dentro de cada pantalla de rasgo del wizard.
- `src/App.tsx` — modificado para el nuevo `FlowState`, `wizardStep`, y la navegación entre landing/wizard/resto del flujo.

## Testing

- `Landing.test.tsx`: renderiza título/subtítulo/botón; el botón navega al wizard.
- `WizardShell.test.tsx`: la barra de progreso refleja el paso actual; el botón "Atrás" llama al callback correspondiente; no se muestra botón "Atrás" cuando se indica que es el primer paso.
- `NameStep.test.tsx`: el botón "Siguiente" está deshabilitado con campo vacío/solo espacios, habilitado con texto válido.
- `App.test.tsx`: se actualiza para cubrir el nuevo flujo landing → wizard → selección de los 6 pasos → disparo de generación (sustituyendo el test actual que verificaba el botón único de "Descubrir" en una sola pantalla).
- `AttributeGroup.test.tsx`: sin cambios, sigue cubriendo el componente reutilizado.

## Fuera de alcance (Fase A)

- Iconos/avatares por opción de rasgo (Fase B).
- Animación de huevo por etapas y barra de carga durante el loading de generación (Fase B — ya existe una versión simple con `LoadingDino.tsx` que no se toca aquí).
- Sonido, confeti, galería de dinos descubiertos, y demás features de la lista de prioridades — no entran en esta spec.
- Generación real de la imagen del logo de landing — se genera con gpt-image-2 como parte de la implementación de esta spec (estilo: Opción A, cartoon amigable), pero no requiere nuevo diseño de backend (reutiliza el mismo flujo de generación de imágenes ya existente, ejecutado una vez de forma manual/script, no por usuario final).
