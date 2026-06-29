import type { Habitat, DinoAttributes } from '../../shared/types';
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

export interface HabitatBackgroundVariant {
  path: string;
  name: string;
}

// Two illustrated sub-biomes per habitat, so two species sharing the same
// habitat don't always show the exact same backdrop. Selection is
// deterministic (see pickHabitatBackground below) so the same combination
// of attributes always renders the same scene.
export const HABITAT_BACKGROUND_VARIANTS: Record<Habitat, [HabitatBackgroundVariant, HabitatBackgroundVariant]> = {
  Selva: [
    { path: '/habitats/selva-1.png', name: 'Canopy Mágico' },
    { path: '/habitats/selva-2.png', name: 'Raíces Antiguas' },
  ],
  Desierto: [
    { path: '/habitats/desierto-1.png', name: 'Ruinas Doradas' },
    { path: '/habitats/desierto-2.png', name: 'Oasis Estelar' },
  ],
  Océano: [
    { path: '/habitats/oceano-1.png', name: 'Arrecife Encantado' },
    { path: '/habitats/oceano-2.png', name: 'Profundidades Místicas' },
  ],
  Montaña: [
    { path: '/habitats/montana-1.png', name: 'Cumbre Celestial' },
    { path: '/habitats/montana-2.png', name: 'Valle de Cristales' },
  ],
  Volcán: [
    { path: '/habitats/volcan-1.png', name: 'Caldera Mágica' },
    { path: '/habitats/volcan-2.png', name: 'Cima en Erupción' },
  ],
  Ártico: [
    { path: '/habitats/artico-1.png', name: 'Tundra Solar' },
    { path: '/habitats/artico-2.png', name: 'Caverna de Hielo' },
  ],
};

export function pickHabitatBackground(attrs: DinoAttributes): HabitatBackgroundVariant {
  const combined = `${attrs.size}|${attrs.diet}|${attrs.feature}|${attrs.personality}|${attrs.habitat}`;
  let sum = 0;
  for (let i = 0; i < combined.length; i++) {
    sum += combined.charCodeAt(i);
  }
  const variantIndex = sum % 2;
  return HABITAT_BACKGROUND_VARIANTS[attrs.habitat][variantIndex];
}

export const RARITY_STAR_COUNT: Record<Rarity, number> = RARITY_TIER_NUMBERS;

export const CARD_BACK_PATH = '/card-back.png';
