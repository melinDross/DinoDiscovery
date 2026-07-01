import { forwardRef, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
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

// "Terminal ARG" look: near-black glass frame, cyan/magenta glow, monospace
// type — chosen from a 4-way live-preview comparison (see git history for
// the other three: parchment/museum-plate, comic/sticker, and the original
// green/purple fantasy look) to lean into the alternate-reality-game
// "species discovery" framing more explicitly than the previous style.
// The frame ring itself is a separate warm amber gradient (not the cyan
// glass tone used inside) — picked from a 4-color live comparison
// (cyan/indigo/amber/emerald) for warmth against the cool interior glow,
// and a plain gradient over two textured options (hammered/scaled) tried
// alongside it — the flat gradient read as cleaner at the ring's 20px
// width, where a repeating pattern felt busy/noisy up close.
const FRAME_BORDER_COLOR = '#5a3a10';
const FRAME_BG = '#160f06';
const FRAME_TEXTURE = `linear-gradient(160deg, #caa03a 0%, #8a5a1a 50%, ${FRAME_BORDER_COLOR} 100%)`;
const TEXT_COLOR = '#d6faff';
const PANEL_BACKGROUND =
  'radial-gradient(circle at 10% 0%, rgba(0,255,225,0.22), transparent 55%),' +
  'radial-gradient(circle at 95% 100%, rgba(255,0,220,0.28), transparent 55%),' +
  'linear-gradient(160deg, #081420 0%, #050d16 55%, #060a14 100%)';
const PANEL_BORDER_COLOR = 'rgba(0,255,225,0.4)';
const RARITY_BADGE_TEXT_COLOR = '#04121a';
const FOOTER_TEXT_COLOR = '#5fd9d1';
const LABEL_TEXT_COLOR = '#5fd9d1';
const BADGE_BG = `${FRAME_BG}e6`;
const WATERMARK_TEXT = 'DINO-DISCOVERY.PAGES.DEV';

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

const DESCRIPTION_MAX_LINES = 4;

// The description is always exactly 3 short sentences (see the generation
// prompt in functions/lib/anthropic.ts), but at the card's fixed 420px
// width they don't always fit in 4 lines. CSS line-clamp would cut the
// last visible line mid-word/mid-sentence and append "…", which reads
// worse for a kids' app than just dropping the trailing sentence(s)
// entirely. This measures the rendered height against a 4-line budget and,
// if it overflows, drops sentences from the end (always at a ". " boundary)
// until it fits — so the shown text is always either the full description
// or a whole number of complete sentences, never a mid-sentence cut.
function useDescriptionClamp(description: string): {
  ref: RefObject<HTMLParagraphElement | null>;
  displayed: string;
} {
  const ref = useRef<HTMLParagraphElement>(null);
  const [displayed, setDisplayed] = useState(description);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      setDisplayed(description);
      return;
    }

    const sentences = description.match(/[^.!?]+[.!?]+(\s+|$)/g) ?? [description];
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 0;
    const maxHeight = lineHeight * DESCRIPTION_MAX_LINES + 1; // +1px rounding slack

    el.textContent = description;
    if (!lineHeight || el.scrollHeight <= maxHeight) {
      setDisplayed(description);
      return;
    }

    let fitted = description;
    for (let count = sentences.length - 1; count >= 1; count--) {
      const candidate = sentences.slice(0, count).join('').trim();
      el.textContent = candidate;
      if (el.scrollHeight <= maxHeight) {
        fitted = candidate;
        break;
      }
      fitted = candidate;
    }
    setDisplayed(fitted);
  }, [description]);

  return { ref, displayed };
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
  // Shows a repeating diagonal watermark over the whole card. Only ever
  // passed by CardScene (the interactive, on-screen card) — the hidden
  // capture node in App.tsx that html2canvas actually downloads renders a
  // bare Card without this prop, so it stays clean. A phone screenshot of
  // the on-screen card carries the watermark; the official PNG from the
  // email-gate download doesn't — the goal isn't blocking screenshots
  // (not possible from a web page), it's making the email-gated download
  // the visibly better artifact so people use it instead of a screenshot.
  watermark?: boolean;
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
  ({ discovererName, result, attrs, foilTilt = { x: 0, y: 0 }, watermark = false }, ref) => {
    const { ref: descriptionRef, displayed: displayedDescription } = useDescriptionClamp(result.description);
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
        <div
          className="p-[20px] rounded-[28px] overflow-hidden shadow-[inset_0_0_40px_rgba(0,0,0,0.35)]"
          style={{ backgroundImage: FRAME_TEXTURE, color: TEXT_COLOR }}
        >
          <div className="rounded-[10px] overflow-hidden" style={{ backgroundColor: FRAME_BG }}>
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
            className="relative z-[2] mx-4 rounded-[24px] border px-2 pt-8 pb-3 overflow-visible shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
            style={{
              background: PANEL_BACKGROUND,
              borderColor: PANEL_BORDER_COLOR,
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
                    className={`max-w-none object-contain rounded-[4px] pointer-events-none ${index === 2 ? 'w-[72px] h-[72px]' : 'w-14 h-14'}`}
                  />
                  <span
                    className="mt-1 text-[11px] font-semibold leading-tight break-words text-center font-mono"
                    style={{ color: TEXT_COLOR }}
                  >
                    {cell.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t my-3" style={{ borderColor: PANEL_BORDER_COLOR }} />

            <div className="grid grid-cols-3 px-2 text-xs">
              <div className="text-center">
                <p className="text-[11px] uppercase tracking-wide" style={{ color: LABEL_TEXT_COLOR }}>Puntuación</p>
                <p className="font-mono uppercase tracking-widest text-lg" style={{ color: TEXT_COLOR }}>{score}</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] uppercase tracking-wide" style={{ color: LABEL_TEXT_COLOR }}>Rareza</p>
                <p className="font-mono uppercase tracking-widest text-sm" style={{ color: TEXT_COLOR }}>{RARITY_LABELS[rarity]}</p>
                <p style={{ color: LABEL_TEXT_COLOR }}>{stars}</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] uppercase tracking-wide" style={{ color: LABEL_TEXT_COLOR }}>Tier</p>
                <p className="font-mono uppercase tracking-widest text-lg" style={{ color: TEXT_COLOR }}>{RARITY_STAR_COUNT[rarity]}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-5 py-3 text-[11px]" style={{ color: FOOTER_TEXT_COLOR }}>
            <span>
              Descubridor/a: <strong>{discovererName}</strong>
            </span>
            <span className="text-right">{discoveryDate}</span>
          </div>
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
        {/* Habitat sub-biome tag: a bar flush against the left edge of
            the art, like a spine label on a book — the text is centered
            within the strip and rotated -90deg, rather than floating over
            the art as a horizontal pill, so it reads as part of the
            frame's structure. Chosen from a 3-way live-preview comparison
            (a rotated version of the old pill, and a bookmark-ribbon tab
            poking past the edge — both since deleted). Spans the middle
            60% of the art height (not the full height) so it doesn't
            collide with the species-ID pill in the top-left corner.

            Deliberately its own sibling at z-15, *below* the dino (z-20)
            — not inside the z-30 text/tag overlay with the other badges.
            When a big dino's cutout scale/pose pushes it toward the left
            edge, it needs to visually cover this tag rather than the tag
            floating on top of the dino's silhouette; the species-ID/rarity
            badges and name/description block stay in the z-30 overlay
            above the dino since those need to stay legible regardless of
            dino pose (see below), but the habitat tag has no such
            requirement — it reads fine partially covered. */}
        <div className="absolute z-[15] pointer-events-none" style={artLayerStyle}>
          <div
            className="absolute left-0 top-[20%] bottom-[20%] w-7 flex items-center justify-center border-r shadow-lg"
            style={{ backgroundColor: BADGE_BG, borderColor: PANEL_BORDER_COLOR }}
          >
            <span
              className="text-[11px] uppercase tracking-wide whitespace-nowrap"
              style={{ color: TEXT_COLOR, transform: 'rotate(-90deg)' }}
            >
              {habitatBackground.name}
            </span>
          </div>
        </div>

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
            badge, and name/description gradient stay legible regardless of
            how far the dino pose reaches. */}
        <div className="absolute z-30 pointer-events-none" style={artLayerStyle}>
          <span
            className="absolute top-3 left-3 px-2 py-1 shadow-lg text-xs border font-mono rounded-[4px]"
            style={{
              backgroundColor: BADGE_BG,
              borderColor: PANEL_BORDER_COLOR,
              color: TEXT_COLOR,
            }}
          >
            {speciesId}
          </span>
          <span
            className="absolute top-3 right-3 px-3 py-1 text-xs font-mono uppercase tracking-widest border border-white/20 shadow-lg rounded-[4px]"
            style={{ backgroundColor: RARITY_BADGE_COLORS[rarity], color: RARITY_BADGE_TEXT_COLOR }}
          >
            {RARITY_LABELS[rarity]}
          </span>
          <div
            className="absolute bottom-0 left-0 right-0 px-4 pt-14 pb-3"
            style={{
              background: `linear-gradient(to top, ${FRAME_BG} 0%, ${BADGE_BG} 55%, transparent 100%)`,
            }}
          >
            {/* pt-14 (was pt-20): the habitat tag used to float over this
                gradient block as a horizontal pill, so extra top padding
                kept the name clear of it. Now that the tag lives in the
                left-edge strip (see above), that clearance isn't needed —
                freeing the name/sci-name/description to sit a bit higher. */}
            <h2 className="font-mono uppercase tracking-widest text-xl text-center" style={{ color: TEXT_COLOR }}>
              {result.commonName}
            </h2>
            <p className="italic text-xs text-center opacity-80 font-mono" style={{ color: TEXT_COLOR }}>
              {result.scientificName}
            </p>
            <p
              ref={descriptionRef}
              className="italic text-center text-xs mt-2 font-mono"
              style={{ color: TEXT_COLOR }}
            >
              {displayedDescription}
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

        {/* Diffraction bands — a third foil layer, between the broad rainbow
            sweep and the glare below/above respectively. Two independent
            `repeating-linear-gradient`s at different angles, each reacting
            to a *different* axis of `foilTilt` (the steep-angle stripes to
            `x`, the shallow-angle ones to `y`) and at different pixel
            offsets, so the two stripe patterns visibly cross and re-align
            as the card tilts, rather than moving in lockstep. This is
            closer to how a real diffraction-grating hologram (the shiny
            foil on real trading cards) actually looks — several fine bands
            that separate and converge with viewing angle — than a single
            smooth gradient can get. Kept as a third layer rather than
            replacing the broad rainbow sweep, since the two serve different
            jobs: the sweep gives an overall color wash, this gives fine
            structure/texture within it.

            Bands are wide (40-70px period) with soft transparent-to-color
            fades between them, not hard-edged narrow stripes — a first
            version used a ~20px period with fully opaque adjacent bands,
            which read as harsh flickering "old TV static" rather than a
            soft hologram texture, especially at small drag movements where
            the pattern shifted by a full band-width in a couple of pixels.
            Wider, softer bands plus smaller position multipliers (both
            roughly half of the earlier version) fix both problems: fewer
            visible edges, and the pattern shifts more gradually per pixel
            of tilt. */}
        {isFoilEligible && (
          <div
            aria-hidden="true"
            className="absolute pointer-events-none mix-blend-overlay z-40"
            style={{
              ...artLayerStyle,
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              opacity: 0.22,
              backgroundImage:
                'repeating-linear-gradient(70deg,' +
                'transparent 0px,' +
                'rgba(255,110,190,0.4) 20px,' +
                'transparent 40px,' +
                'rgba(120,200,255,0.4) 60px,' +
                'transparent 80px),' +
                'repeating-linear-gradient(20deg,' +
                'transparent 0px,' +
                'rgba(255,255,255,0.28) 25px,' +
                'transparent 50px)',
              backgroundPosition:
                `${foilTilt.x * 30}px ${foilTilt.y * 10}px, ` +
                `${foilTilt.y * 35}px ${foilTilt.x * 10}px`,
              WebkitMaskImage:
                'linear-gradient(to bottom, black 0%, black 72%, transparent 100%)',
              maskImage: 'linear-gradient(to bottom, black 0%, black 72%, transparent 100%)',
            }}
          />
        )}

        {/* Specular glare — a fourth, independent foil layer on top of
            everything above. One gradient reacting to tilt reads as "a
            stripe sliding across the card," not "shimmering" — real foil
            (and the well-known CSS holo-card techniques it's modeled on)
            gets its liveliness from multiple things moving differently at
            once: a slow, broad rainbow sweep, fine diffraction bands
            (both above), and a small, fast bright glint that moves like a
            reflected light source (this layer). All three read `foilTilt`,
            but this one uses a much larger multiplier so it visibly darts
            around while the other layers move more slowly — that speed
            difference is what actually sells "alive" instead of "sliding".
            `mix-blend-screen` (not overlay, used above) always brightens
            like a highlight would, which is correct for a glint but would
            wash out the habitat art if used for the broader layers
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

        {/* On-screen-only watermark deterrent (see the `watermark` prop
            doc above): repeating diagonal rows of the site URL, low
            opacity, above every other layer (z-50) so it survives
            regardless of dino pose/foil. `select-none` + pointer-events-none
            so it never interferes with the drag-tilt-flip interaction or
            reads as selectable/copyable text. */}
        {watermark && (
          <div className="absolute inset-0 z-50 pointer-events-none select-none overflow-hidden rounded-[28px]">
            {[12, 32, 52, 72, 92].map((top) => (
              <div
                key={top}
                className="absolute left-1/2 whitespace-nowrap font-mono font-bold uppercase"
                style={{
                  top: `${top}%`,
                  fontSize: 11,
                  letterSpacing: '0.18em',
                  color: 'rgba(255,255,255,0.16)',
                  transform: 'translate(-50%, -50%) rotate(-18deg)',
                }}
              >
                {WATERMARK_TEXT} • {WATERMARK_TEXT} • {WATERMARK_TEXT}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);
Card.displayName = 'Card';
