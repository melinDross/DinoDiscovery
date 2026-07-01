import { forwardRef, useEffect, useState } from 'react';
import type { GenerateDinoResponse, DinoAttributes } from '../../shared/types';
import { generateSpeciesId, calculateRarity, calculateRarityScore, type Rarity } from '../utils/speciesHash';
import { cutoutDinoImage } from '../utils/dinoCutout';
import {
  RARITY_LABELS,
  RARITY_BADGE_COLORS,
  RARITY_STAR_COUNT,
  ATTRIBUTE_MEDALLION_PATHS,
  pickHabitatBackground,
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
  // Normalized -1..1 tilt, from CardScene's live mouse/touch tilt state.
  // Drives the holo-foil sheen's position (see below) so it visibly sweeps
  // as the card is tilted, like real foil trading cards. Optional/defaulted
  // so Card can still be used standalone (e.g. the hidden html2canvas
  // capture node in App.tsx) without CardScene wiring this through.
  foilTilt?: { x: number; y: number };
}

// Rarity tiers eligible for the holo-foil sheen — same tiers that got the
// (now-removed) rarity glow, so common/uncommon stay visually plainer.
const FOIL_ELIGIBLE_RARITIES: ReadonlySet<Rarity> = new Set(['rare', 'epic', 'legendary']);

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
  ({ discovererName, result, attrs, foilTilt = { x: 0, y: 0 } }, ref) => {
    const discoveryDate = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const speciesId = generateSpeciesId({ ...attrs });
    const rarity = calculateRarity(attrs);
    const isFoilEligible = FOIL_ELIGIBLE_RARITIES.has(rarity);
    const score = calculateRarityScore(attrs);
    const stars = '★'.repeat(RARITY_STAR_COUNT[rarity]);
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
      <div ref={ref} className="relative w-[420px] select-none" style={{ WebkitTouchCallout: 'none' } as React.CSSProperties}>
        {/* Everything that must stay clipped to the rounded frame lives in
            here. The dino and the text/tag overlay are rendered as later
            siblings below, on top of this, so they're never clipped by it. */}
        <div className="rounded-[28px] border-[20px] border-[#0a0a0a] bg-bg text-cream overflow-hidden">
          <div className="relative h-[440px] bg-surface2 overflow-hidden">
            <img
              src={habitatBackground.path}
              alt={`Entorno: ${attrs.habitat}`}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />
            {/* Grounding contact shadow so the dino reads as standing on the
                scene rather than floating in front of it. */}
            <div className="absolute left-1/2 bottom-[22%] -translate-x-1/2 w-56 h-10 bg-black/55 rounded-[40px] blur-xl" />
          </div>

          {/* Continuous stone tablet: attribute medallions, divider, then the
              score/rarity/tier row, all inside a single panel (no separate
              boxed sections) so it reads as one piece like the reference card.
              No negative top margin here (an earlier version had -mt-[10px]
              to visually fuse this panel with the art above it) — the
              text/tag overlay's gradient block (z-30, see below) is anchored
              to the *bottom* of the same 440px art area and is fully opaque
              at its own bottom edge, which sits right where that overlap
              would land. Pulling the panel up into that zone hid the top of
              every medallion behind the opaque gradient — looked exactly
              like the icons were clipped, but nothing was actually clipping
              them, they were just painted over by a higher z-index element. */}
          <div
            className="relative z-[2] mx-4 rounded-[24px] border border-accent/30 px-2 pt-8 pb-3 overflow-visible shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
            style={{
              background:
                'radial-gradient(circle at 15% -10%, rgba(178,255,0,0.28), transparent 50%),' +
                'radial-gradient(circle at 90% 110%, rgba(157,92,255,0.4), transparent 55%),' +
                'radial-gradient(circle at 50% 50%, rgba(80,50,140,0.35), transparent 70%),' +
                'linear-gradient(160deg, #2d1b4e 0%, #1a1330 45%, #142420 75%, #0f1f16 100%)',
            }}
          >
            <div className="grid grid-cols-5 gap-1 text-center">
              {cells.map((cell, index) => (
                <div
                  key={cell.label}
                  className={`flex flex-col items-center min-w-0 px-0.5 ${index === 2 ? '-mt-7' : ''}`}
                >
                  <img
                    src={cell.icon}
                    alt={cell.alt}
                    className={`max-w-none object-contain rounded-[40px] pointer-events-none ${index === 2 ? 'w-16 h-16' : 'w-12 h-12'}`}
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

            <div className="grid grid-cols-3 px-2 text-xs">
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
              Descubridor/a: <strong className="text-sage">{discovererName}</strong>
            </span>
            <span className="text-right">{discoveryDate}</span>
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
          <div className="absolute bottom-0 left-0 right-0 px-4 pt-20 pb-3 bg-gradient-to-t from-bg via-bg/90 to-transparent">
            <h2 className="font-display text-xl text-white uppercase tracking-wide text-center">
              {result.commonName}
            </h2>
            <p className="italic text-xs text-cream/80 text-center">{result.scientificName}</p>
            <p className="italic text-center text-cream text-xs mt-2 line-clamp-3">
              {result.description}
            </p>
          </div>
        </div>

        {/* Holo-foil sheen — rare/epic/legendary only, matching the tiers
            that previously got a rarity glow (see CLAUDE.md for the glow's
            history: it went through a rarity-colored <canvas> before being
            dropped for this foil look instead). Sits above the dino (z-20)
            and the text overlay (z-30) since a real foil laminate covers
            the whole card front, but its own mask fades it out before it
            reaches the description text block so legibility isn't
            affected — the description's own gradient backing already
            starts around the same point (see the text overlay above).
            `background-position` is driven directly by `foilTilt`, which
            CardScene derives from its existing mouse/touch tilt state — no
            new render loop, just one more inline style write alongside the
            ones tilt already causes every frame it changes. This piggybacks
            on `transform`/tilt-driven interaction, the one class of
            continuous update already proven safe inside this 3D scene,
            instead of the `box-shadow`/`filter` properties that broke
            things in earlier rarity-glow attempts (see CLAUDE.md).

            The base offset (20%, not 50%) biases the visible rainbow band
            toward the art's top-left corner at rest, so the diagonal sweep
            (the gradient runs at 115deg, roughly top-left-to-bottom-right)
            reads immediately at a glance instead of requiring the user to
            tilt the card first to reveal it. `mix-blend-overlay` (not
            color-dodge, tried first) — color-dodge only ever brightens,
            which blew out to a washed/flat look against bright habitat art,
            most visibly on mobile Safari's wide-gamut rendering; overlay
            respects the underlying luminance so it reads as a subtle sheen
            on both light and dark parts of the art instead of a uniform
            haze. Gradient stop alphas and the layer's own opacity were also
            both turned down for the same "too strong by default" reason. */}
        {isFoilEligible && (
          <div
            aria-hidden="true"
            className="absolute pointer-events-none mix-blend-overlay z-40"
            style={{
              ...artLayerStyle,
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              opacity: 0.32,
              backgroundImage:
                'linear-gradient(115deg,' +
                'transparent 0%,' +
                'rgba(255,80,180,0.55) 18%,' +
                'rgba(255,225,80,0.55) 34%,' +
                'rgba(110,255,200,0.55) 50%,' +
                'rgba(90,140,255,0.55) 66%,' +
                'rgba(255,80,180,0.55) 82%,' +
                'transparent 100%)',
              backgroundSize: '180% 180%',
              backgroundPosition: `${20 + foilTilt.x * 20}% ${20 + foilTilt.y * 20}%`,
              WebkitMaskImage:
                'linear-gradient(to bottom, black 0%, black 72%, transparent 100%)',
              maskImage: 'linear-gradient(to bottom, black 0%, black 72%, transparent 100%)',
            }}
          />
        )}

        {/* Specular glare — a second, independent foil layer on top of the
            rainbow sheen above. One gradient reacting to tilt reads as "a
            stripe sliding across the card," not "shimmering" — real foil
            (and the well-known CSS holo-card techniques it's modeled on)
            gets its liveliness from *two* things moving differently at
            once: a slow, broad rainbow sweep (above) and a small, fast
            bright glint that moves like a reflected light source (this
            layer). Both read `foilTilt`, but this one uses a much larger
            multiplier so it visibly darts around while the rainbow layer
            is still gently sweeping — that speed difference between the
            two layers is what actually sells "alive" instead of "sliding".
            `mix-blend-screen` (not overlay, used above) always brightens
            like a highlight would, which is correct for a glint but would
            wash out the habitat art if used for the broad rainbow layer
            (see the overlay-vs-color-dodge note above). */}
        {isFoilEligible && (
          <div
            aria-hidden="true"
            className="absolute pointer-events-none mix-blend-screen z-40"
            style={{
              ...artLayerStyle,
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              opacity: 0.4,
              backgroundImage:
                'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.25) 35%, transparent 65%)',
              backgroundSize: '55% 55%',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: `${50 + foilTilt.x * 65}% ${50 + foilTilt.y * 65}%`,
              WebkitMaskImage:
                'linear-gradient(to bottom, black 0%, black 72%, transparent 100%)',
              maskImage: 'linear-gradient(to bottom, black 0%, black 72%, transparent 100%)',
            }}
          />
        )}
      </div>
    );
  }
);
Card.displayName = 'Card';
