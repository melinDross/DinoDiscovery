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
      <div
        ref={ref}
        className="relative w-[420px] rounded-[28px] border-[6px] border-[#0a0a0a] bg-bg text-cream overflow-hidden shadow-2xl"
      >
        {/* Full-bleed art: habitat background + dino composited on top, title and
            tags floating directly over the art instead of in a boxed header. */}
        <div className="relative h-[540px] bg-surface2 overflow-hidden">
          <img
            src={HABITAT_BACKGROUND_PATHS[attrs.habitat]}
            alt={`Entorno: ${attrs.habitat}`}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <img
            src={result.imageUrl}
            alt={result.commonName}
            className="absolute inset-0 w-full h-full object-contain scale-110"
          />

          <div className="absolute top-0 inset-x-0 flex items-center justify-center gap-2 pt-4 pb-10 px-4 bg-gradient-to-b from-bg/80 to-transparent">
            <img src={BRAND_EMBLEM_PATH} alt="Dino Discovery" className="w-7 h-7 object-contain drop-shadow" />
            <h1 className="font-display text-xl text-accent uppercase tracking-wide drop-shadow">
              Dino Discovery
            </h1>
          </div>

          <span className="absolute top-16 left-3 px-2 py-1 bg-bg/80 text-xs font-mono rounded-[40px]">
            {speciesId}
          </span>
          <span
            className="absolute top-16 right-3 px-3 py-1 rounded-[40px] text-xs font-display uppercase tracking-wide text-bg"
            style={{ backgroundColor: RARITY_BADGE_COLORS[rarity] }}
          >
            {RARITY_LABELS[rarity]}
          </span>

          <div className="absolute bottom-0 left-0 right-0 px-4 pt-16 pb-7 bg-gradient-to-t from-bg via-bg/90 to-transparent">
            <h2 className="font-display text-xl text-white uppercase tracking-wide text-center">
              {result.commonName}
            </h2>
            <p className="italic text-xs text-cream/80 text-center">{result.scientificName}</p>
            <p className="italic text-center text-cream text-xs mt-2 line-clamp-2">
              {result.description}
            </p>
          </div>
        </div>

        {/* Continuous stone tablet: attribute medallions, divider, then the
            score/rarity/tier row, all inside a single panel (no separate
            boxed sections) so it reads as one piece like the reference card. */}
        <div className="relative z-[2] -mt-[28px] mx-4 rounded-[24px] bg-[#1c1c1c] border border-accent/20 px-2 pt-4 pb-3 overflow-visible">
          <div className="grid grid-cols-5 gap-1 text-center">
            {cells.map((cell, index) => (
              <div
                key={cell.label}
                className={`flex flex-col items-center min-w-0 px-0.5 ${index === 2 ? '-mt-7' : ''}`}
              >
                <img
                  src={cell.icon}
                  alt={cell.alt}
                  className={`object-contain rounded-[40px] ${index === 2 ? 'w-16 h-16' : 'w-12 h-12'}`}
                />
                <span className="mt-1 text-[9px] uppercase tracking-wide text-cream/70 leading-tight">
                  {cell.label}
                </span>
                <span className="text-[10px] font-semibold leading-tight break-words text-center">
                  {cell.value}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-accent/20 my-3" />

          <div className="flex items-center justify-between px-2 text-xs">
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
        </div>

        <div className="flex items-center justify-between px-5 py-3 text-[10px] text-moss">
          <span>
            Descubridor/a: <strong className="text-sage">{discovererName}</strong> · Arte generado con IA
          </span>
          <span className="text-right">
            {expeditionLabel} · {discoveryDate}
          </span>
        </div>
      </div>
    );
  }
);
Card.displayName = 'Card';
