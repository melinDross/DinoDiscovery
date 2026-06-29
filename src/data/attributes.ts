import type { Size, Habitat, Diet, Feature, Personality } from '../../shared/types';

export const SIZES: Size[] = ['Diminuto', 'Pequeño', 'Mediano', 'Grande', 'Gigante', 'Coloso'];
export const HABITATS: Habitat[] = ['Selva', 'Desierto', 'Océano', 'Montaña', 'Volcán', 'Ártico'];
export const DIETS: Diet[] = ['Carnívoro', 'Herbívoro', 'Omnívoro', 'Oófago'];
export const FEATURES: Feature[] = [
  'Cuernos',
  'Alas',
  'Escamas coloridas',
  'Cola poderosa',
  'Armadura',
  'Súper garras',
];
export const PERSONALITIES: Personality[] = ['Feroz', 'Amigable', 'Veloz', 'Sigiloso'];

export const ATTRIBUTE_EMOJIS: Record<string, string> = {
  Diminuto: '🐜',
  Pequeño: '🐭',
  Mediano: '🦎',
  Grande: '🦏',
  Gigante: '🦕',
  Coloso: '🦣',
  Selva: '🌴',
  Desierto: '🏜️',
  Océano: '🌊',
  Montaña: '🏔️',
  Volcán: '🌋',
  Ártico: '🧊',
  Carnívoro: '🥩',
  Herbívoro: '🌿',
  Omnívoro: '🍖',
  Oófago: '🥚',
  Cuernos: '🦄',
  Alas: '🦅',
  'Escamas coloridas': '✨',
  'Cola poderosa': '💥',
  Armadura: '🛡️',
  'Súper garras': '⚡',
  Feroz: '😤',
  Amigable: '😊',
  Veloz: '⚡',
  Sigiloso: '🥷',
};
