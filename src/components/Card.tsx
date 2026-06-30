import { forwardRef, useEffect, useState } from 'react';
import type { GenerateDinoResponse, DinoAttributes } from '../../shared/types';
import { generateSpeciesId, calculateRarity, calculateRarityScore } from '../utils/speciesHash';
import { cutoutDinoImage } from '../utils/dinoCutout';
import {
  RARITY_LABELS,
  RARITY_BADGE_COLORS,
  RARITY_STAR_COUNT,
  ATTRIBUTE_MEDALLION_PATHS,
  pickHabitatBackground,
  getExpeditionLabel,
} from '../data/cardTheme';

// Strips the dino image's known solid background (see src/utils/dinoCutout.ts)
// so it composites as a true cutout over the habitat art, with its own
// drop-shadow, instead of showing as a flat rectangle on top of the scene.
function useDinoCutout(imageUrl: string): string {
  const [src, setSrc] = useState(imageUrl);

  useEffect(() => {
    setSrc(imageUrl);
    let cancelled = false;
    cutoutDinoImage(imageUrl)
      .then((result) => {
        if (!cancelled) setSrc(result);
      })
      .catch(() => {
        // CORS/decoding failure — keep showing the original image untouched.
      });
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return src;
}

export interface CardProps {
  discovererName: string;
  result: GenerateDinoResponse;
  attrs: DinoAttributes;
}

// Must match the frame's border-[20px] and the art area's h-[ART_HEIGHT_PX]
// below. Stacking, from back to front: the framed box (background art,
// stone panel, footer) → the dino, rendered as a sibling *outside* the
// frame's overflow-hidden box so a big creature can pop a claw/tail past
// the card's border → the text/tag overlay, a further sibling on top of the
// dino so the name/description/pills stay legible no matter how the dino
// is posed.
const CARD_BORDER_PX = 20;
const ART_HEIGHT_PX = 440;

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
    const cutoutImageUrl = useDinoCutout(result.imageUrl);
    const habitatBackground = pickHabitatBackground(attrs);

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

    const artLayerStyle = {
      top: CARD_BORDER_PX,
      left: CARD_BORDER_PX,
      width: `calc(100% - ${CARD_BORDER_PX * 2}px)`,
      height: ART_HEIGHT_PX,
    };

    return (
      <div ref={ref} className="relative w-[420px]">
        {/* Everything that must stay clipped to the rounded frame lives in
            here. The dino and the text/tag overlay are rendered as later
            siblings below, on top of this, so they're never clipped by it. */}
        <div className="rounded-[28px] border-[20px] border-[#0a0a0a] bg-bg text-cream overflow-hidden shadow-2xl">
          <div className="relative h-[440px] bg-surface2 overflow-hidden">
            <img
              src={habitatBackground.path}
              alt={`Entorno: ${attrs.habitat}`}
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Grounding contact shadow so the dino reads as standing on the
                scene rather than floating in front of it. */}
            <div className="absolute left-1/2 bottom-[22%] -translate-x-1/2 w-56 h-10 bg-black/55 rounded-[40px] blur-xl" />
          </div>

          {/* Continuous stone tablet: attribute medallions, divider, then the
              score/rarity/tier row, all inside a single panel (no separate
              boxed sections) so it reads as one piece like the reference card. */}
          <div className="relative z-[2] -mt-[10px] mx-4 rounded-[24px] bg-[#1c1c1c] border border-accent/20 px-2 pt-4 pb-3 overflow-visible">
            <div className="grid grid-cols-5 gap-1 text-center">
              {cells.map((cell, index) => (
                <div
                  key={cell.label}
                  className={`flex flex-col items-center min-w-0 px-0.5 ${index === 2 ? '-mt-7' : ''}`}
                >
                  <img
                    src={cell.icon}
                    alt={cell.alt}
                    className={`max-w-none object-contain rounded-[40px] ${index === 2 ? 'w-16 h-16' : 'w-12 h-12'}`}
                  />
                  <span className="mt-1 text-[10px] uppercase tracking-wide text-cream/70 leading-tight">
                    {cell.label}
                  </span>
                  <span className="text-[11px] font-semibold leading-tight break-words text-center">
                    {cell.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-accent/20 my-3" />

            <div className="flex items-center justify-between px-2 text-xs">
              <div className="text-center">
                <p className="text-[11px] uppercase tracking-wide text-sage">Puntuación</p>
                <p className="font-display text-lg text-cream">{score}</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] uppercase tracking-wide text-sage">Rareza</p>
                <p className="font-display text-sm text-cream">{RARITY_LABELS[rarity]}</p>
                <p className="text-accent">{stars}</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] uppercase tracking-wide text-sage">Tier</p>
                <p className="font-display text-lg text-cream">{RARITY_STAR_COUNT[rarity]}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-5 py-3 text-[11px] text-moss">
            <span>
              Descubridor/a: <strong className="text-sage">{discovererName}</strong> · Arte generado con IA
            </span>
            <span className="text-right">
              {expeditionLabel} · {discoveryDate}
            </span>
          </div>
        </div>

        {/* The dino: above the framed box and not clipped by it, so a large
            enough creature can visually pop a claw/tail/horn past the card's
            border for a 3D effect. `object-top` (instead of the object-contain
            default of centering) anchors the artwork to the top of its box, so
            any letterboxing slack from a non-matching aspect ratio collects at
            the bottom — keeping the creature's feet/tail clear of the
            medallion panel below instead of riding right up against it. The
            scale was also pulled back from 110% to 105% (less aggressive
            bleed) after real-device testing showed dinos getting visually
            cropped at the bottom edge. */}
        <img
          src={cutoutImageUrl}
          alt={result.commonName}
          className="absolute object-contain object-top scale-105 pointer-events-none z-20"
          style={{
            ...artLayerStyle,
            filter:
              'drop-shadow(0 18px 14px rgba(0,0,0,0.5)) drop-shadow(0 5px 6px rgba(0,0,0,0.4))',
          }}
        />

        {/* Text/tag overlay: above the dino, so the species ID, rarity
            badge, sub-biome name and the name/description gradient stay
            legible regardless of how far the dino pose reaches. */}
        <div className="absolute z-30 pointer-events-none" style={artLayerStyle}>
          <span className="absolute top-3 left-3 px-2 py-1 bg-bg/90 border border-accent/30 shadow-lg text-xs font-mono rounded-[40px]">
            {speciesId}
          </span>
          <span
            className="absolute top-3 right-3 px-3 py-1 rounded-[40px] text-xs font-display uppercase tracking-wide text-bg border border-white/20 shadow-lg"
            style={{ backgroundColor: RARITY_BADGE_COLORS[rarity] }}
          >
            {RARITY_LABELS[rarity]}
          </span>
          <span className="absolute bottom-[27%] left-3 px-2 py-1 bg-bg/90 border border-accent/30 shadow-lg text-[11px] uppercase tracking-wide rounded-[40px]">
            {habitatBackground.name}
          </span>
          <div className="absolute bottom-0 left-0 right-0 px-4 pt-16 pb-10 bg-gradient-to-t from-bg via-bg/90 to-transparent">
            <h2 className="font-display text-xl text-white uppercase tracking-wide text-center">
              {result.commonName}
            </h2>
            <p className="italic text-xs text-cream/80 text-center">{result.scientificName}</p>
            <p className="italic text-center text-cream text-xs mt-2 line-clamp-2">
              {result.description}
            </p>
          </div>
        </div>
      </div>
    );
  }
);
Card.displayName = 'Card';
