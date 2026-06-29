import type { Habitat } from '../../shared/types';
import type { Rarity } from '../utils/speciesHash';

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
