import { forwardRef } from 'react';
import type { GenerateDinoResponse, DinoAttributes } from '../../shared/types';
import { generateSpeciesId, calculateRarity, calculateRarityScore } from '../utils/speciesHash';
import {
  RARITY_LABELS,
  RARITY_BADGE_COLORS,
  RARITY_STAR_COUNT,
  ATTRIBUTE_MEDALLION_PATHS,
  BRAND_EMBLEM_PATH,
  HABITAT_BACKGROUND_PATHS,
  getExpeditionLabel,
} from '../data/cardTheme';

export interface CardProps {
  discovererName: string;
  result: GenerateDinoResponse;
  attrs: DinoAttributes;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ discovererName, result, attrs }, ref) => {
    const discoveryDate = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const speciesId = generateSpeciesId({ ...attrs });
    const rarity = calculateRarity(attrs);
    const score = calculateRarityScore(attrs);
    const stars = '★'.repeat(RARITY_STAR_COUNT[rarity]);
    const expeditionLabel = getExpeditionLabel(result.resultId);

    const cells: Array<{ icon: string; alt: string; label: string; value: string }> = [
      {
        icon: ATTRIBUTE_MEDALLION_PATHS[attrs.size] ?? '',
        alt: `Tamaño: ${attrs.size}`,
        label: 'Tamaño',
        value: attrs.size,
      },
      {
        icon: ATTRIBUTE_MEDALLION_PATHS[attrs.diet] ?? '',
        alt: `Dieta: ${attrs.diet}`,
        label: 'Dieta',
        value: attrs.diet,
      },
      {
        icon: ATTRIBUTE_MEDALLION_PATHS[attrs.feature] ?? '',
        alt: `Característica: ${attrs.feature}`,
        label: 'Poder',
        value: attrs.feature,
      },
      {
        icon: ATTRIBUTE_MEDALLION_PATHS[attrs.personality] ?? '',
        alt: `Personalidad: ${attrs.personality}`,
        label: 'Personalidad',
        value: attrs.personality,
      },
      {
        icon: ATTRIBUTE_MEDALLION_PATHS[attrs.habitat] ?? '',
        alt: `Hábitat: ${attrs.habitat}`,
        label: 'Hábitat',
        value: attrs.habitat,
      },
    ];

    return (
      <div ref={ref} className="relative w-[380px] bg-bg text-cream corner-brackets overflow-hidden">
        <div className="flex items-center justify-center gap-2 px-4 py-3 bg-bg border-b border-accent/20">
          <img src={BRAND_EMBLEM_PATH} alt="Dino Discovery" className="w-6 h-6 object-contain" />
          <h1 className="font-display text-lg text-accent uppercase tracking-wide">
            Dino Discovery
          </h1>
        </div>

        <div className="relative h-[340px] bg-surface2 overflow-hidden">
          <img
            src={HABITAT_BACKGROUND_PATHS[attrs.habitat]}
            alt={`Entorno: ${attrs.habitat}`}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <img
            src={result.imageUrl}
            alt={result.commonName}
            className="relative w-full h-full object-contain"
          />
          <span className="absolute top-3 left-3 px-2 py-1 bg-bg/80 text-xs font-mono rounded-[40px]">
            {speciesId}
          </span>
          <span
            className="absolute top-3 right-3 px-3 py-1 rounded-[40px] text-xs font-display uppercase tracking-wide text-bg"
            style={{ backgroundColor: RARITY_BADGE_COLORS[rarity] }}
          >
            {RARITY_LABELS[rarity]}
          </span>
          <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-bg/95 via-bg/80 to-transparent">
            <h2 className="font-display text-lg text-white uppercase tracking-wide text-center">
              {result.commonName}
            </h2>
            <p className="italic text-xs text-cream/80 text-center">{result.scientificName}</p>
            <p className="italic text-center text-cream text-xs mt-1 line-clamp-2">
              {result.description}
            </p>
          </div>
        </div>

        <div className="relative z-[2] -mt-[20px] mx-4 rounded-[24px] bg-[#1c1c1c] border border-accent/20 px-1 py-3 grid grid-cols-5 gap-0.5 text-center overflow-visible">
          {cells.map((cell, index) => (
            <div
              key={cell.label}
              className={`flex flex-col items-center min-w-0 px-0.5 ${index === 2 ? '-mt-4' : ''}`}
            >
              <img
                src={cell.icon}
                alt={cell.alt}
                className={`object-contain rounded-[40px] ${index === 2 ? 'w-12 h-12' : 'w-9 h-9'}`}
              />
              <span className="mt-1 text-[8px] uppercase tracking-wide text-cream/70 leading-tight">
                {cell.label}
              </span>
              <span className="text-[9px] font-semibold leading-tight break-words text-center">
                {cell.value}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-5 py-4 mt-2 text-xs">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wide text-sage">Puntuación</p>
            <p className="font-display text-lg text-cream">{score}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wide text-sage">Rareza</p>
            <p className="font-display text-sm text-cream">{RARITY_LABELS[rarity]}</p>
            <p className="text-accent">{stars}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wide text-sage">Tier</p>
            <p className="font-display text-lg text-cream">{RARITY_STAR_COUNT[rarity]}</p>
          </div>
        </div>

        <div className="flex items-center justify-between px-5 pb-4 text-xs text-sage">
          <span>
            Descubridor/a: <strong className="text-cream">{discovererName}</strong>
          </span>
          <span className="text-right">
            {expeditionLabel}
            <br />
            {discoveryDate}
          </span>
        </div>

        <p className="text-center text-[10px] text-moss pb-2">Arte generado con IA</p>
      </div>
    );
  }
);
Card.displayName = 'Card';
