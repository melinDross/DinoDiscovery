# Sistema de Rareza — DinoDiscovery

## Resumen

La rareza de cada especie se calcula mediante un **sistema de puntos** basado en los 5 atributos elegidos por el usuario, con **multiplicadores opcionales** por combinaciones especiales.

**Rango de puntos posible: 6 → 20**

---

## Tabla de puntos por atributo

### Tamaño
Cuanto más extremo el tamaño, mayor rareza.

| Valor | Puntos |
|---|---|
| Mediano | 1 |
| Pequeño | 2 |
| Grande | 2 |
| Diminuto | 3 |
| Gigantesco | 3 |
| Coloso | 4 |

### Dieta
Lo exótico suma más.

| Valor | Puntos |
|---|---|
| Herbívoro | 1 |
| Omnívoro | 2 |
| Carnívoro | 2 |
| Oófago | 4 |

### Característica física
Las más agresivas o inusuales valen más.

| Valor | Puntos |
|---|---|
| Escamas | 1 |
| Cola poderosa | 2 |
| Cuernos | 2 |
| Armadura | 3 |
| Super garras | 3 |
| Alas | 4 |

### Personalidad
Los extremos son más raros.

| Valor | Puntos |
|---|---|
| Amigable | 1 |
| Veloz | 2 |
| Feroz | 2 |
| Sigiloso | 3 |

### Hábitat
Los entornos más hostiles generan especies más raras.

| Valor | Puntos |
|---|---|
| Selva | 1 |
| Desierto | 2 |
| Océano | 2 |
| Montaña | 2 |
| Volcán | 3 |
| Ártico | 3 |

---

## Tiers de rareza

| Tier | Puntos | Nombre | % combinaciones aprox |
|---|---|---|---|
| 1 | 6 – 8 | Común | ~25% |
| 2 | 9 – 11 | Poco común | ~35% |
| 3 | 12 – 14 | Raro | ~25% |
| 4 | 15 – 17 | Épico | ~12% |
| 5 | 18 – 20 | Legendario | ~3% |

Total de combinaciones posibles: **3.456** (6 × 6 × 4 × 6 × 4)

---

## Multiplicadores por combinación especial

Ciertas combinaciones biológicamente absurdas o extremas aplican un multiplicador al total de puntos antes de calcular el tier.

| Combinación | Multiplicador | Razón |
|---|---|---|
| Coloso + Oófago + Alas | ×1.5 | Absurdo biológico — ultra raro |
| Diminuto + Sigiloso + Volcán | ×1.3 | Superviviente extremo |
| Amigable + Armadura + Ártico | ×1.2 | Oxímoron adorable |

> Los multiplicadores se aplican al total de puntos y el resultado se redondea antes de asignar tier. Una combinación puede subir hasta un tier por encima de su puntuación base.

---

## Implementación de referencia

```typescript
// src/utils/speciesHash.ts

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

const POINTS: Record<string, Record<string, number>> = {
  size: {
    'Mediano': 1, 'Pequeño': 2, 'Grande': 2,
    'Diminuto': 3, 'Gigantesco': 3, 'Coloso': 4
  },
  diet: {
    'Herbívoro': 1, 'Omnívoro': 2, 'Carnívoro': 2, 'Oófago': 4
  },
  physical: {
    'Escamas': 1, 'Cola poderosa': 2, 'Cuernos': 2,
    'Armadura': 3, 'Super garras': 3, 'Alas': 4
  },
  personality: {
    'Amigable': 1, 'Veloz': 2, 'Feroz': 2, 'Sigiloso': 3
  },
  habitat: {
    'Selva': 1, 'Desierto': 2, 'Océano': 2, 'Montaña': 2,
    'Volcán': 3, 'Ártico': 3
  }
}

const SPECIAL_MULTIPLIERS: Array<{
  match: Partial<Record<string, string>>,
  multiplier: number
}> = [
  { match: { size: 'Coloso', diet: 'Oófago', physical: 'Alas' }, multiplier: 1.5 },
  { match: { size: 'Diminuto', personality: 'Sigiloso', habitat: 'Volcán' }, multiplier: 1.3 },
  { match: { personality: 'Amigable', physical: 'Armadura', habitat: 'Ártico' }, multiplier: 1.2 },
]

function getMultiplier(attrs: Record<string, string>): number {
  for (const { match, multiplier } of SPECIAL_MULTIPLIERS) {
    const matches = Object.entries(match).every(([k, v]) => attrs[k] === v)
    if (matches) return multiplier
  }
  return 1
}

export function calculateRarity(attrs: {
  size: string
  diet: string
  physical: string
  personality: string
  habitat: string
}): Rarity {
  const base =
    (POINTS.size[attrs.size] ?? 1) +
    (POINTS.diet[attrs.diet] ?? 1) +
    (POINTS.physical[attrs.physical] ?? 1) +
    (POINTS.personality[attrs.personality] ?? 1) +
    (POINTS.habitat[attrs.habitat] ?? 1)

  const total = Math.round(base * getMultiplier(attrs))

  if (total >= 18) return 'legendary'
  if (total >= 15) return 'epic'
  if (total >= 12) return 'rare'
  if (total >= 9)  return 'uncommon'
  return 'common'
}
```

---

## Sistema de ID de descubrimiento

Cada descubrimiento recibe un identificador único con el formato:

```
DX - HAB - DSC
```

### Estructura

| Bloque | Longitud | Significado |
|---|---|---|
| `DX` | fijo | "Discovery Expedition" — prefijo de marca |
| `HAB` | 3 chars | Hábitat + Rareza + Número de expedición |
| `DSC` | 3 chars | Huella del descubridor |

---

### Bloque HAB

Codifica información de la especie, legible a simple vista.

**Carácter 1 — Hábitat:**

| Hábitat | Código |
|---|---|
| Selva | S |
| Desierto | D |
| Océano | O |
| Montaña | M |
| Volcán | V |
| Ártico | A |

**Carácter 2 — Rareza:**

| Tier | Código |
|---|---|
| Común | C |
| Poco común | U |
| Raro | R |
| Épico | E |
| Legendario | L |

**Carácter 3 — Número de expedición del mes** (1–9, A–Z según volumen)

Ejemplo: `VL4` = Volcán, Legendario, expedición nº 4 de este mes.

---

### Bloque DSC

Huella única del descubridor. Cada carácter tiene significado propio.

**Carácter 1 (P) — Inicial del nombre** convertida a base36:
```
"sofia" → 's' → posición en alfabeto → "S"
"lucas" → 'l' → "L"
```

**Carácter 2 (N) — Longitud del nombre** en base36:
```
"sofia"   = 5 letras → "5"
"martina" = 7 letras → "7"
```

**Carácter 3 (V) — Hash del nombre completo** normalizado, 1 carácter base36:
```
"sofia" → hash % 36 → "Q"
```

**Ejemplos completos:**
```
"Sofía"   → S5Q
"Lucas"   → L5K
"Martina" → M7W
```

El primer carácter siempre revela la inicial del descubridor. Alguien que ve `DX-VL4-S5Q` puede saber que la `S` corresponde a alguien cuyo nombre empieza por S.

---

### Normalización del nombre

Antes de calcular el bloque DSC, el nombre se normaliza para que variantes del mismo nombre produzcan el mismo ID:

```typescript
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // elimina acentos
    .trim()
}
```

`"Sofía"`, `"sofia"` y `"SOFIA"` producen el mismo bloque DSC.

---

### Implementación de referencia

```typescript
// src/utils/speciesHash.ts

const HABITAT_CODES: Record<string, string> = {
  'Selva': 'S', 'Desierto': 'D', 'Océano': 'O',
  'Montaña': 'M', 'Volcán': 'V', 'Ártico': 'A'
}

const RARITY_CODES: Record<string, string> = {
  'common': 'C', 'uncommon': 'U', 'rare': 'R',
  'epic': 'E', 'legendary': 'L'
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function simpleHash(str: string): number {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) + str.charCodeAt(i)
    h = h & h
  }
  return Math.abs(h)
}

function buildDiscovererBlock(name: string): string {
  const normalized = normalizeName(name)
  const P = normalized[0]?.toUpperCase() ?? 'X'
  const N = normalized.length.toString(36).toUpperCase()
  const V = (simpleHash(normalized) % 36).toString(36).toUpperCase()
  return `${P}${N}${V}`
}

function getExpeditionNumber(habitat: string, rarity: string): string {
  // En producción: obtener de base de datos o KV store
  // Para MVP: hash determinista del mes actual + habitat + rarity
  const month = new Date().toISOString().slice(0, 7)
  return ((simpleHash(month + habitat + rarity) % 9) + 1).toString()
}

export function generateDiscoveryId(attrs: {
  habitat: string
  rarity: string
  discovererName: string
}): string {
  const hab = HABITAT_CODES[attrs.habitat] ?? 'X'
  const rar = RARITY_CODES[attrs.rarity] ?? 'X'
  const exp = getExpeditionNumber(attrs.habitat, attrs.rarity)
  const dsc = buildDiscovererBlock(attrs.discovererName)
  return `DX-${hab}${rar}${exp}-${dsc}`
}
```

**Ejemplo de output:**
```
generateDiscoveryId({
  habitat: 'Volcán',
  rarity: 'legendary',
  discovererName: 'Sofía'
})
// → "DX-VL4-S5Q"
```

---

## Notas de diseño

- El tier **Legendario** representa el ~3% de combinaciones — suficientemente raro para que compartirlo tenga valor social.
- El tier **Común** no es negativo narrativamente: en el universo ARG, todas las especies son descubrimientos reales. La rareza indica lo difícil que fue encontrarla, no su importancia.
- Los multiplicadores son ampliables. Nuevas expediciones temáticas pueden introducir nuevas combinaciones especiales con multiplicadores propios.
- Este sistema es **determinista**: los mismos atributos siempre producen la misma rareza. Eso es intencional — refuerza la narrativa de que la especie "ya existía".

