import { forwardRef } from 'react';
import type { GenerateDinoResponse, DinoAttributes } from '../../shared/types';
import { ATTRIBUTE_EMOJIS } from '../data/attributes';
import { generateSpeciesId, calculateRarity } from '../utils/speciesHash';
import { HABITAT_COLORS, HABITAT_REGIONS, RARITY_LABELS, RARITY_BADGE_COLORS, getExpeditionLabel } from '../data/cardTheme';

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
    const headerColor = HABITAT_COLORS[attrs.habitat];
    const region = HABITAT_REGIONS[attrs.habitat];
    const expeditionLabel = getExpeditionLabel(result.resultId);

    const cells: Array<{ emoji: string; label: string; value: string }> = [
      { emoji: ATTRIBUTE_EMOJIS[attrs.size] ?? '', label: 'Tamaño', value: attrs.size },
      { emoji: ATTRIBUTE_EMOJIS[attrs.diet] ?? '', label: 'Dieta', value: attrs.diet },
      { emoji: ATTRIBUTE_EMOJIS[attrs.habitat] ?? '', label: 'Hábitat', value: attrs.habitat },
      { emoji: ATTRIBUTE_EMOJIS[attrs.feature] ?? '', label: 'Poder', value: attrs.feature },
    ];

    return (
      <div ref={ref} className="relative w-[360px] bg-bg text-cream corner-brackets overflow-hidden">
        <div
          className="relative px-5 pt-5 pb-8 text-center"
          style={{ backgroundColor: headerColor }}
        >
          <span
            className="absolute top-3 right-3 px-3 py-1 rounded-[40px] text-xs font-display uppercase tracking-wide text-bg"
            style={{ backgroundColor: RARITY_BADGE_COLORS[rarity] }}
          >
            {RARITY_LABELS[rarity]}
          </span>
          <p className="italic text-sm text-cream/80">{result.scientificName}</p>
          <h2 className="font-display text-2xl uppercase tracking-wide text-white">
            {result.commonName}
          </h2>
        </div>

        <div className="relative bg-surface2">
          <img
            src={result.imageUrl}
            alt={result.commonName}
            className="w-full h-56 object-contain bg-surface2"
          />
          <span className="absolute bottom-2 left-2 px-2 py-1 bg-bg/80 text-xs rounded-[40px]">
            {region.emoji} {region.name}
          </span>
          <span className="absolute bottom-2 right-2 px-2 py-1 bg-bg/80 text-xs font-mono rounded-[40px]">
            {speciesId}
          </span>
        </div>

        <div
          className="relative z-[2] -mt-[18px] mx-4 rounded-[40px] px-2 py-2 grid grid-cols-4 gap-1 text-center"
          style={{ backgroundColor: headerColor }}
        >
          {cells.map((cell) => (
            <div key={cell.label} className="flex flex-col items-center">
              <span className="text-lg" aria-hidden="true">{cell.emoji}</span>
              <span className="text-[10px] uppercase tracking-wide text-cream/70">{cell.label}</span>
              <span className="text-xs font-semibold">{cell.value}</span>
            </div>
          ))}
        </div>

        <p className="italic text-center text-sage text-sm px-6 pt-4">{result.description}</p>

        <div className="flex items-center justify-between px-5 py-4 mt-2 text-xs text-sage">
          <span>
            Descubridor/a: <strong className="text-cream">{discovererName}</strong>
          </span>
          <span className="text-right">
            {expeditionLabel}
            <br />
            {discoveryDate}
          </span>
        </div>
      </div>
    );
  }
);
Card.displayName = 'Card';
