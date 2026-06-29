# LoadingDino: animación del huevo, barra de progreso y mensajes (punto 7 de future-features.md)

## Goal

Sustituir la pantalla de carga actual (emojis estáticos con `animate-bounce`, 4 fases fijas de 1.5s) por una secuencia de 6 ilustraciones propias del huevo rompiéndose, con barra de progreso simulada y mensajes de tranquilidad si la generación tarda más de lo normal. La generación real (Claude + gpt-image-2 en paralelo) no expone progreso real — es un único `fetch` que resuelve de golpe — así que la barra y el ritmo de fases son una estimación, no progreso exacto.

## Assets

6 PNG generados con gpt-image-2 (mismo estilo "toy/figurine" 3D que `public/landing-logo.png`: paleta naranja-rojo-morado-dorado, iluminación de estudio), con fondo blanco removido por post-procesado (umbral de canal mínimo RGB) a transparencia real, en `public/loading/`:

1. `egg-1-intact.png` — huevo intacto
2. `egg-2-wobble.png` — huevo bamboleándose
3. `egg-3-crack.png` — grietas en la cáscara
4. `egg-4-broken-top.png` — trozo superior roto, hueco oscuro visible
5. `egg-5-claws.png` — garras saliendo por la abertura
6. `egg-6-burst.png` — estallido de luz lima/dorado (núcleo intencionalmente no-blanco-puro para sobrevivir el post-procesado de transparencia), sin revelar al dinosaurio

Las fases 1-5 fueron generadas con fondo blanco sólido (`gpt-image-2` no soporta el parámetro `background: transparent`) y transparentadas con un script puntual (umbral de canal mínimo RGB 232-250, alpha interpolado en el rango para bordes suaves). No es perfecto en aristas con brillos especulares muy claros, pero es aceptable para iconografía de carga a este tamaño.

## Timeline de fases

| Fase | Imagen | Texto | Duración | Animación CSS |
|---|---|---|---|---|
| 1 | `egg-1-intact.png` | "Incubando el huevo..." | 4s fija | respiración sutil (`scale 1→1.03→1`, loop) |
| 2 | `egg-2-wobble.png` | "Algo se mueve dentro..." | 4s fija | rotación oscilante izq/dcha (`rotate -6deg→6deg`, loop) |
| 3 | `egg-3-crack.png` | "¡Está agrietándose!" | 4s fija | pulso de brillo cálido (`box-shadow`/`filter: brightness` loop) |
| 4 | `egg-4-broken-top.png` | "Está rompiendo el cascarón..." | 4s fija | sacudida/jitter (`translateX` pequeño, loop rápido) |
| 5 | `egg-5-claws.png` | "¡Está saliendo!" (ver mensajes de tranquilidad) | **se mantiene** hasta que la API responde | tirones sutiles hacia arriba (`translateY` loop) |
| 6 | `egg-6-burst.png` | "¡Ha nacido tu dinosaurio!" | ~600ms, solo al recibir la respuesta | flash de escala (`scale 0.7→1.3`, `opacity` in/out) |

Las fases 1-4 suman 16s de preludio fijo y variado (cubre buena parte del rango típico de 15-20s observado). Si la API tarda más, se permanece en la fase 5 el tiempo que haga falta. La fase 6 nunca se "espera": se dispara en el instante en que `isDone` pasa a `true`, dure lo que dure el resto.

## Barra de progreso (simulada)

`progress% = 90 × (1 − e^(−t/12))`, donde `t` = segundos desde el montaje del componente. Nunca alcanza 100% por sí sola (asíntota en 90%); al recibir la respuesta real, salta a 100% inmediatamente y se dispara la fase 6. Es una función pura de `t`, sin estado adicional — fácil de testear con valores de entrada fijos.

## Mensajes de tranquilidad

Solo sustituyen el texto de la fase 5 ("¡Está saliendo!") si se permanece en ella más allá de estos umbrales (medidos desde el inicio total, no desde la entrada a fase 5 — como fase 5 empieza a los 16s, esto da margen real de 0s y 8s respectivamente dentro de fase 5):

- `t < 16s`: texto de fase normal ("¡Está saliendo!")
- `16s ≤ t < 24s`: "Tu dinosaurio es un poco tímido, está tardando un poco más..."
- `t ≥ 24s`: "¡Los mejores descubrimientos llevan su tiempo! Ya casi está..."

## Contrato del componente

`LoadingDino` deja de ser un componente "tonto" autónomo: necesita saber cuándo la API ha respondido para disparar la fase 6 y avisar a `App.tsx` de que puede pasar a `result`/`error`.

```ts
interface LoadingDinoProps {
  isDone: boolean;        // true cuando generateDino() ha resuelto (éxito o error)
  onTransitionEnd: () => void; // llamado tras el flash de la fase 6 (~600ms)
}
```

- Mientras `isDone === false`: ciclo de fases 1→5 con sus tiempos/mensajes descritos arriba; la barra de progreso avanza según la fórmula.
- Cuando `isDone` pasa a `true` (en cualquier fase en la que esté): se interrumpe el ciclo, se salta a la fase 6, la barra salta a 100%, y tras ~600ms se llama `onTransitionEnd()`.
- `App.tsx`: en `handleDiscover`, en vez de `setFlowState('result')`/`setFlowState('error')` inmediatamente tras `await generateDino(...)`, se guarda el resultado/error pendiente y se marca `isDiscoveryDone = true`; el cambio real de `flowState` ocurre dentro del callback `onTransitionEnd` que pasa a `LoadingDino`.

## Testing

Con `vi.useFakeTimers()` (mismo patrón que el `LoadingDino.test.tsx` actual):

- Arranca en fase 1 con su texto.
- Avanza por las fases 2-4 en los tiempos esperados (4s cada una).
- Permanece en fase 5 más allá de los 16s totales sin pasar a fase 6 mientras `isDone` siga en `false`.
- Muestra el primer mensaje de tranquilidad a partir de los 16s, el segundo a partir de los 24s.
- Al pasar `isDone` a `true` en cualquier punto, renderiza la fase 6 y llama a `onTransitionEnd` tras ~600ms.
- La función de progreso (extraída como función pura exportada, p. ej. `calculateProgress(t: number): number`) se testea con valores de entrada directos, sin necesidad de fake timers.

`App.test.tsx`: actualizar los `wait(...)` existentes que asumen que tras `generateDino` resuelto se pasa inmediatamente a `ResultScreen`, para tener en cuenta el nuevo retraso de ~600ms de la fase 6 antes del `findByRole('heading', ...)`.

## Out of scope

- No se toca `api.ts`, `generate-dino.ts`, ni ningún backend — el backend sigue sin exponer progreso real.
- No se añade caché de imágenes precargadas explícita más allá de lo que el navegador haga por defecto con `<img src>` (las 6 imágenes son pequeñas, ~1024×1024 PNG con transparencia, optimizables más adelante si pesan demasiado — no se mide en este spec).
- No se toca el resto de `App.tsx` (wizard, atributos, certificado, email gate).
