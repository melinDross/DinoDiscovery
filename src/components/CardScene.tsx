import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { GenerateDinoResponse, DinoAttributes } from '../../shared/types';
import { Card } from './Card';
import { calculateRarity, type Rarity } from '../utils/speciesHash';
import { CARD_BACK_PATH } from '../data/cardTheme';

interface CardSceneProps {
  discovererName: string;
  result: GenerateDinoResponse;
  attrs: DinoAttributes;
}

export function clampTilt(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  maxDeg: number
): { rotateX: number; rotateY: number } {
  const px = (clientX - rect.left) / rect.width - 0.5;
  const py = (clientY - rect.top) / rect.height - 0.5;
  const rotateY = Math.max(-maxDeg, Math.min(maxDeg, px * maxDeg * 2)) || 0;
  const rotateX = Math.max(-maxDeg, Math.min(maxDeg, -py * maxDeg * 2)) || 0;
  return { rotateX, rotateY };
}

// Card.tsx is built at a fixed 420px design width (its internal 3-layer
// stacking — frame / dino / text overlay — is positioned with literal px
// math that isn't worth making fluid). Rather than touch that, this scales
// the whole thing down uniformly to fit narrower viewports: a CSS
// transform:scale() applies identically to all three absolutely-positioned
// sibling layers, so they never drift out of alignment with each other.
export function computeFitScale(availableWidth: number, naturalWidth: number): number {
  if (naturalWidth <= 0 || availableWidth <= 0) return 1;
  return Math.min(1, availableWidth / naturalWidth);
}

const CARD_NATURAL_WIDTH = 420;

// The dino's cutout layer pops past the framed box's top/bottom edges
// (scale-110 + drop-shadow), but Card.tsx's own box height doesn't grow to
// account for it (it's an absolutely-positioned sibling). Reserve extra
// space below the scaled card so that overflow never visually collides with
// the buttons rendered after CardScene in ResultScreen.
const DINO_OVERFLOW_BUFFER_PX = 16;

const MAX_TILT_DEG = 15;
const FLIP_DURATION_MS = 800;
const SPIN_DURATION_MS = 1400;
const DRAG_SENSITIVITY_DEG_PER_PX = 0.6;
// How far a finger must travel (px) before we decide the gesture is
// horizontal (card flip) vs vertical (page scroll). Once resolved the axis
// is locked for the rest of that touch.
const DRAG_AXIS_LOCK_PX = 8;
const DRAG_SNAP_TRANSITION = '320ms ease-out';
const TILT_ACTIVE_TRANSITION = '80ms linear';
const TILT_RESET_TRANSITION = '400ms ease-out';
const FLIP_TRANSITION = `transform ${FLIP_DURATION_MS}ms ease-out`;
const SPIN_TRANSITION = `transform ${SPIN_DURATION_MS}ms ease-in-out`;
const NO_TRANSITION = 'none';

// "Shiny card" idle glow, keyed by rarity tier — common/uncommon don't glow
// (undefined), rare/epic/legendary do, each in a color that roughly matches
// its RARITY_BADGE_COLORS hue (blue/purple/gold) so the glow reads as
// "this rarity" rather than just "expensive-looking".
const GLOW_RGB_BY_RARITY: Partial<Record<Rarity, string>> = {
  rare: '64, 140, 255',
  epic: '190, 90, 255',
  legendary: '255, 150, 0',
};

export function CardScene({ discovererName, result, attrs }: CardSceneProps) {
  const [hasFlippedIn, setHasFlippedIn] = useState(false);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [transition, setTransition] = useState(FLIP_TRANSITION);
  const [spinDeg, setSpinDeg] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  // Some WebKit/iOS Safari versions fail to honor backface-visibility:hidden
  // inside a 3D-transformed, filtered subtree (the dino's drop-shadow layer
  // triggers it) and render both faces blended together mid-flip. As a
  // browser-agnostic fallback, explicitly hide whichever face isn't the one
  // currently facing the viewer via visibility, timed to the midpoint of
  // each rotation — independent of whatever backface-visibility does.
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const facingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartXRef = useRef<number | null>(null);
  const dragStartYRef = useRef(0);
  const dragBaseSpinRef = useRef(0);
  // 'h' = locked to horizontal (card flip), 'v' = locked to vertical (let
  // page scroll, cancel card drag), null = not yet decided
  const dragAxisRef = useRef<'h' | 'v' | null>(null);

  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const flipperRef = useRef<HTMLDivElement>(null);
  const glowCanvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [naturalHeight, setNaturalHeight] = useState(0);
  // Mirrors of `scale`/`naturalHeight` for the glow rAF loop below, so it
  // can read current layout numbers every frame without re-running the
  // effect (and restarting the entrance burst) on every resize.
  const scaleRef = useRef(1);
  const naturalHeightRef = useRef(0);
  scaleRef.current = scale;
  naturalHeightRef.current = naturalHeight;

  const rarity = calculateRarity(attrs);
  const glowColor = GLOW_RGB_BY_RARITY[rarity];

  // Traces a rounded-rect path manually (rather than relying on
  // ctx.roundRect, unsupported on iOS Safari < 16) so the glow stroke
  // follows the card's actual rounded shape instead of a plain rectangle.
  function tracePillPath(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // Rarity glow — Option D: an absolutely-positioned <canvas> drawn above
  // the whole card scene, sharing no rendering context with the 3D
  // transform tree at all. Two earlier attempts both failed for reasons
  // tied to that 3D tree: animating `box-shadow` on flipperRef
  // (.card-flipper, inside .card-perspective) reintroduced the iOS habitat-
  // flash compositing bug; animating `filter` on innerRef
  // (.card-scene-wrapper, an ancestor of .card-perspective) rendered
  // nothing at all — WebKit/Chromium don't reliably rasterize `filter` on
  // an ancestor of a `preserve-3d` subtree. A canvas overlay is a fully
  // separate element with its own 2D rendering context, so neither failure
  // mode can occur; the trade-off (also true of both prior attempts) is
  // that the glow doesn't visually rotate with the card mid-flip.
  useEffect(() => {
    const canvas = glowCanvasRef.current;
    const outer = outerRef.current;
    if (!glowColor || !canvas || !outer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return; // e.g. jsdom in tests, or unsupported environments

    const CARD_RADIUS_PX = 48; // must match .card-flipper's border-radius
    const startTime = performance.now();
    const BURST_MS = 600;  // entrance flash duration
    const PULSE_MS = 2400; // breathing cycle

    let rafId: number;

    function frame(now: number) {
      const dpr = window.devicePixelRatio || 1;
      const cssWidth = outer!.offsetWidth;
      const cssHeight = outer!.offsetHeight;
      if (canvas!.width !== cssWidth * dpr || canvas!.height !== cssHeight * dpr) {
        canvas!.width = cssWidth * dpr;
        canvas!.height = cssHeight * dpr;
      }
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, cssWidth, cssHeight);

      const elapsed = now - startTime;
      let blur: number, alpha: number, lineWidth: number;

      if (elapsed < BURST_MS) {
        // Entrance burst: ramp up to peak at 40%, settle back to idle by 100%
        const t = elapsed / BURST_MS;
        const burst = t < 0.4 ? t / 0.4 : 1 - (t - 0.4) / 0.6;
        blur = 24 + burst * 46;
        alpha = 0.55 + burst * 0.4;
        lineWidth = 4 + burst * 4;
      } else {
        // Smooth breathing sine wave
        const phase = ((elapsed - BURST_MS) / PULSE_MS) * Math.PI * 2;
        const breath = Math.sin(phase) * 0.5 + 0.5; // 0→1→0
        blur = 24 + breath * 20;
        alpha = 0.5 + breath * 0.3;
        lineWidth = 4 + breath * 2;
      }

      const cardWidth = CARD_NATURAL_WIDTH * scaleRef.current;
      const cardHeight = naturalHeightRef.current * scaleRef.current;
      const x = (cssWidth - cardWidth) / 2;
      const radius = CARD_RADIUS_PX * scaleRef.current;

      if (cardWidth > 0 && cardHeight > 0) {
        ctx!.save();
        ctx!.shadowColor = `rgba(${glowColor}, ${alpha})`;
        ctx!.shadowBlur = blur;
        ctx!.strokeStyle = `rgba(${glowColor}, ${alpha})`;
        ctx!.lineWidth = lineWidth;
        tracePillPath(ctx!, x, 0, cardWidth, cardHeight, radius);
        ctx!.stroke();
        ctx!.restore();
      }

      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [glowColor]);

  if (!hasFlippedIn) {
    // Triggers the flip-in transition on the first paint after mount.
    requestAnimationFrame(() => setHasFlippedIn(true));
  }

  useEffect(() => {
    if (!hasFlippedIn) return;
    facingTimeoutRef.current = setTimeout(() => setFacing('front'), FLIP_DURATION_MS / 2);
    return () => {
      if (facingTimeoutRef.current !== null) {
        clearTimeout(facingTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFlippedIn]);

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current !== null) {
        clearTimeout(spinTimeoutRef.current);
      }
      if (facingTimeoutRef.current !== null) {
        clearTimeout(facingTimeoutRef.current);
      }
    };
  }, []);

  // useLayoutEffect (not useEffect) so the fit-scale is measured and applied
  // before the browser paints — otherwise the card briefly renders at its
  // full unscaled 420px width on first paint, visibly overflowing/off-center
  // for a frame before snapping down to the correct scale.
  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    function update() {
      if (!outer || !inner) return;
      setScale(computeFitScale(outer.offsetWidth, CARD_NATURAL_WIDTH));
      setNaturalHeight(inner.offsetHeight);
    }

    update();
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(outer);
    resizeObserver.observe(inner);
    return () => resizeObserver.disconnect();
  }, []);

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (isSpinning) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const next = clampTilt(event.clientX, event.clientY, rect, MAX_TILT_DEG);
    setTransition(TILT_ACTIVE_TRANSITION);
    setTilt(next);
  }

  function handleMouseLeave() {
    if (isSpinning) return;
    setTransition(TILT_RESET_TRANSITION);
    setTilt({ rotateX: 0, rotateY: 0 });
  }

  // Drag-to-rotate: the card follows the finger horizontally while dragging
  // (no CSS transition — `spinDeg` is updated directly per touchmove, so the
  // rendered rotation always matches the live drag position 1:1), and snaps
  // Horizontal swipe → card flip (rotateY via spinDeg, snaps on release).
  // Vertical swipe → page scroll (we cancel the card drag and do nothing,
  // letting the page scroll naturally). Axis is decided once per gesture
  // once the finger travels DRAG_AXIS_LOCK_PX in either direction; until
  // then we wait rather than doing anything that would cause rendering
  // artifacts on iOS during an ambiguous gesture.
  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (isSpinning) return;
    const touch = event.touches[0];
    if (!touch) return;
    dragStartXRef.current = touch.clientX;
    dragStartYRef.current = touch.clientY;
    dragBaseSpinRef.current = spinDeg;
    dragAxisRef.current = null;
  }

  function handleTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    if (isSpinning || dragStartXRef.current === null) return;
    const touch = event.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - dragStartXRef.current;
    const deltaY = touch.clientY - dragStartYRef.current;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Resolve the axis lock on first significant movement.
    if (dragAxisRef.current === null) {
      if (absX < DRAG_AXIS_LOCK_PX && absY < DRAG_AXIS_LOCK_PX) return;
      dragAxisRef.current = absX >= absY ? 'h' : 'v';
    }

    // Vertical gesture: cancel card drag, let page scroll normally.
    if (dragAxisRef.current === 'v') {
      dragStartXRef.current = null;
      return;
    }

    // Horizontal gesture: rotate the card.
    const nextSpin = dragBaseSpinRef.current + deltaX * DRAG_SENSITIVITY_DEG_PER_PX;
    setTransition(NO_TRANSITION);
    setSpinDeg(nextSpin);
    setTilt({ rotateX: 0, rotateY: 0 });
    const totalDeg = baseFlipDeg + nextSpin;
    const mod = ((totalDeg % 360) + 360) % 360;
    setFacing(mod > 90 && mod < 270 ? 'back' : 'front');
  }

  function handleTouchEnd() {
    dragAxisRef.current = null;
    if (isSpinning) return;
    if (dragStartXRef.current !== null) {
      dragStartXRef.current = null;
      setSpinDeg((current) => {
        const totalDeg = baseFlipDeg + current;
        const snapped = Math.round(totalDeg / 180) * 180;
        const mod = ((snapped % 360) + 360) % 360;
        setFacing(mod === 180 ? 'back' : 'front');
        return snapped - baseFlipDeg;
      });
      setTransition(DRAG_SNAP_TRANSITION);
      setTilt({ rotateX: 0, rotateY: 0 });
      return;
    }
    setTransition(TILT_RESET_TRANSITION);
    setTilt({ rotateX: 0, rotateY: 0 });
  }

  function handleSpinClick() {
    dragStartXRef.current = null;
    dragAxisRef.current = null;
    if (spinTimeoutRef.current !== null) {
      clearTimeout(spinTimeoutRef.current);
    }
    if (facingTimeoutRef.current !== null) {
      clearTimeout(facingTimeoutRef.current);
    }
    // A full +360 spin always ends up visually identical to where it
    // started, whichever face that was (the card may already be resting on
    // its back from a drag-flip) — so the facing sequence and the end-state
    // reset must both be relative to the *current* facing, never hardcoded
    // to 'front'/0. Hardcoding either was the cause of a visible jump-cut
    // (the card appearing to vanish for a frame) whenever the spin was
    // triggered from the back face.
    const startFacing = facing;
    setIsSpinning(true);
    setHasFlippedIn(true);
    setTransition(SPIN_TRANSITION);
    setTilt({ rotateX: 0, rotateY: 0 });
    setSpinDeg((current) => current + 360);
    facingTimeoutRef.current = setTimeout(() => {
      setFacing(startFacing === 'front' ? 'back' : 'front');
      facingTimeoutRef.current = setTimeout(() => {
        facingTimeoutRef.current = null;
        setFacing(startFacing);
      }, SPIN_DURATION_MS * 0.55);
    }, SPIN_DURATION_MS * 0.2);
    spinTimeoutRef.current = setTimeout(() => {
      spinTimeoutRef.current = null;
      setIsSpinning(false);
      setTransition(TILT_RESET_TRANSITION);
      setSpinDeg((current) => current - 360);
      setTilt({ rotateX: 0, rotateY: 0 });
      setFacing(startFacing);
    }, SPIN_DURATION_MS);
  }

  const baseFlipDeg = hasFlippedIn ? 0 : 180;
  const totalRotateY = baseFlipDeg + tilt.rotateY + spinDeg;

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div
        ref={outerRef}
        className="relative w-full overflow-visible"
        style={{
          height: naturalHeight ? (naturalHeight + DINO_OVERFLOW_BUFFER_PX) * scale : undefined,
        }}
      >
        <div
          ref={innerRef}
          className="absolute left-1/2 top-0 card-scene-wrapper"
          style={{
            width: CARD_NATURAL_WIDTH,
            transform: `translateX(-50%) scale(${scale})`,
            transformOrigin: 'top center',
          }}
        >
          <div
            className="card-perspective"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            <div
              ref={flipperRef}
              className="card-flipper"
              style={{
                transform: `rotateX(${tilt.rotateX}deg) rotateY(${totalRotateY}deg)`,
                transition,
              }}
            >
              <div className="card-face" style={{ visibility: facing === 'front' ? 'visible' : 'hidden' }}>
                <Card discovererName={discovererName} result={result} attrs={attrs} />
              </div>
              <div
                className="card-face card-face-back"
                style={{ visibility: facing === 'back' ? 'visible' : 'hidden' }}
              >
                <img
                  src={CARD_BACK_PATH}
                  alt="Dino Discovery"
                  className="w-full h-full object-cover rounded-[28px] border-[20px] border-[#0a0a0a]"
                />
              </div>
            </div>
          </div>
        </div>
        <canvas
          ref={glowCanvasRef}
          aria-hidden="true"
          className="absolute inset-0 w-full h-full pointer-events-none z-40"
        />
      </div>
      <button
        type="button"
        onClick={handleSpinClick}
        className="px-4 py-2 min-h-[44px] text-accent font-display uppercase tracking-wide border border-accent/40 hover:border-accent transition-colors"
      >
        Girar carta
      </button>
    </div>
  );
}
