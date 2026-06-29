export function generateSpeciesId(attributes: Record<string, string>): string {
  const sorted = Object.keys(attributes)
    .sort()
    .map((k) => attributes[k])
    .join('|');
  let h = 5381;
  for (let i = 0; i < sorted.length; i++) {
    h = (h << 5) + h + sorted.charCodeAt(i);
    h = h & h;
  }
  const base = Math.abs(h).toString(36).toUpperCase().padStart(6, '0');
  return `DX-${base.slice(0, 3)}-${base.slice(3, 6)}`;
}

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface RarityAttributes {
  size: string;
  diet: string;
  feature: string;
  personality: string;
  habitat: string;
}

// Point tables from docs/RARITY_SYSTEM.md. 'Gigante' carries the points the
// doc assigns to 'Gigantesco' (same size tier, kept under the project's
// existing label to avoid renaming an attribute users already see/share).
const SIZE_POINTS: Record<string, number> = {
  Mediano: 1,
  Pequeño: 2,
  Grande: 2,
  Diminuto: 3,
  Gigante: 3,
  Coloso: 4,
};

const DIET_POINTS: Record<string, number> = {
  Herbívoro: 1,
  Omnívoro: 2,
  Carnívoro: 2,
  Oófago: 4,
};

const FEATURE_POINTS: Record<string, number> = {
  'Escamas coloridas': 1,
  'Cola poderosa': 2,
  Cuernos: 2,
  Armadura: 3,
  'Súper garras': 3,
  Alas: 4,
};

const PERSONALITY_POINTS: Record<string, number> = {
  Amigable: 1,
  Veloz: 2,
  Feroz: 2,
  Sigiloso: 3,
};

const HABITAT_POINTS: Record<string, number> = {
  Selva: 1,
  Desierto: 2,
  Océano: 2,
  Montaña: 2,
  Volcán: 3,
  Ártico: 3,
};

const SPECIAL_MULTIPLIERS: Array<{
  match: Partial<RarityAttributes>;
  multiplier: number;
}> = [
  { match: { size: 'Coloso', diet: 'Oófago', feature: 'Alas' }, multiplier: 1.5 },
  { match: { size: 'Diminuto', personality: 'Sigiloso', habitat: 'Volcán' }, multiplier: 1.3 },
  { match: { personality: 'Amigable', feature: 'Armadura', habitat: 'Ártico' }, multiplier: 1.2 },
];

function getMultiplier(attrs: RarityAttributes): number {
  for (const { match, multiplier } of SPECIAL_MULTIPLIERS) {
    const matches = (Object.entries(match) as Array<[keyof RarityAttributes, string]>).every(
      ([key, value]) => attrs[key] === value
    );
    if (matches) return multiplier;
  }
  return 1;
}

export function calculateRarity(attrs: RarityAttributes): Rarity {
  const base =
    (SIZE_POINTS[attrs.size] ?? 1) +
    (DIET_POINTS[attrs.diet] ?? 1) +
    (FEATURE_POINTS[attrs.feature] ?? 1) +
    (PERSONALITY_POINTS[attrs.personality] ?? 1) +
    (HABITAT_POINTS[attrs.habitat] ?? 1);

  const total = Math.round(base * getMultiplier(attrs));

  if (total >= 18) return 'legendary';
  if (total >= 15) return 'epic';
  if (total >= 12) return 'rare';
  if (total >= 9) return 'uncommon';
  return 'common';
}
