import type { Habitat } from '../../shared/types';
import type { Rarity } from '../utils/speciesHash';
import { RARITY_TIER_NUMBERS } from '../utils/speciesHash';

export const HABITAT_COLORS: Record<Habitat, string> = {
  Volcán: '#2d6a9f',
  Ártico: '#2a6a9a',
  Selva: '#2a7a4f',
  Océano: '#1a5a8f',
  Desierto: '#8a5a1a',
  Montaña: '#6b5b4a',
};

export const HABITAT_REGIONS: Record<Habitat, { emoji: string; name: string }> = {
  Volcán: { emoji: '🌋', name: 'Sector Forja' },
  Ártico: { emoji: '🧊', name: 'Sector Hielo Eterno' },
  Selva: { emoji: '🌴', name: 'Sector Esmeralda' },
  Océano: { emoji: '🌊', name: 'Sector Abisal' },
  Desierto: { emoji: '🏜️', name: 'Sector Arena Roja' },
  Montaña: { emoji: '🏔️', name: 'Sector Cumbre Gris' },
};

export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Común',
  uncommon: 'Poco común',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Legendario',
};

export const RARITY_BADGE_COLORS: Record<Rarity, string> = {
  common: '#7a9e7a',
  uncommon: '#3f9d5c',
  rare: '#2d6a9f',
  epic: '#7a3f9d',
  legendary: '#caa23a',
};

const EXPEDITION_NAME = 'Expedición Pangea';

export function getExpeditionLabel(resultId: string): string {
  const number = resultId.replace(/-/g, '').slice(0, 4).toUpperCase();
  return `${EXPEDITION_NAME} #${number}`;
}

export const ATTRIBUTE_SLUGS: Record<string, string> = {
  // Tamaño
  Diminuto: 'diminuto',
  Pequeño: 'pequeno',
  Mediano: 'mediano',
  Grande: 'grande',
  Gigante: 'gigante',
  Coloso: 'coloso',
  // Dieta
  Carnívoro: 'carnivoro',
  Herbívoro: 'herbivoro',
  Omnívoro: 'omnivoro',
  Oófago: 'oofago',
  // Característica
  Cuernos: 'cuernos',
  Alas: 'alas',
  'Escamas coloridas': 'escamas-coloridas',
  'Cola poderosa': 'cola-poderosa',
  Armadura: 'armadura',
  'Súper garras': 'super-garras',
  // Personalidad
  Feroz: 'feroz',
  Amigable: 'amigable',
  Veloz: 'veloz',
  Sigiloso: 'sigiloso',
  // Hábitat
  Selva: 'selva',
  Desierto: 'desierto',
  Océano: 'oceano',
  Montaña: 'montana',
  Volcán: 'volcan',
  Ártico: 'artico',
};

export const ATTRIBUTE_MEDALLION_PATHS: Record<string, string> = Object.fromEntries(
  Object.entries(ATTRIBUTE_SLUGS).map(([value, slug]) => [value, `/icons/medallions/${slug}.png`])
);

export const BRAND_EMBLEM_PATH = '/icons/medallions/emblem.png';

export const HABITAT_SLUGS: Record<Habitat, string> = {
  Selva: 'selva',
  Desierto: 'desierto',
  Océano: 'oceano',
  Montaña: 'montana',
  Volcán: 'volcan',
  Ártico: 'artico',
};

export const HABITAT_BACKGROUND_PATHS: Record<Habitat, string> = {
  Selva: '/habitats/selva.png',
  Desierto: '/habitats/desierto.png',
  Océano: '/habitats/oceano.png',
  Montaña: '/habitats/montana.png',
  Volcán: '/habitats/volcan.png',
  Ártico: '/habitats/artico.png',
};

export const RARITY_STAR_COUNT: Record<Rarity, number> = RARITY_TIER_NUMBERS;
