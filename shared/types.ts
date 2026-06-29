export type Size = 'Pequeño' | 'Mediano' | 'Gigante';
export type Habitat = 'Selva' | 'Desierto' | 'Océano' | 'Montaña' | 'Volcán';
export type Diet = 'Carnívoro' | 'Herbívoro' | 'Omnívoro';
export type Feature =
  | 'Cuernos'
  | 'Alas'
  | 'Escamas coloridas'
  | 'Cola poderosa'
  | 'Armadura'
  | 'Súper garras';
export type Personality = 'Feroz' | 'Amigable' | 'Veloz' | 'Sigiloso';

export interface DinoAttributes {
  size: Size;
  habitat: Habitat;
  diet: Diet;
  feature: Feature;
  personality: Personality;
}

export interface GenerateDinoRequest extends DinoAttributes {
  discovererName: string;
}

export interface GenerateDinoResponse {
  resultId: string;
  scientificName: string;
  commonName: string;
  description: string;
  imageUrl: string;
}

export interface ApiErrorResponse {
  error: 'RATE_LIMITED' | 'API_ERROR';
  message?: string;
  retryAfterSeconds?: number;
}
