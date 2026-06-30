import { useEffect, useRef, useState } from 'react';
import type { GenerateDinoResponse, DinoAttributes } from '../../shared/types';
import { Card } from './Card';
import { calculateRarity } from '../utils/speciesHash';
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
const DINO_OVERFLOW_BUFFER_PX = 56;

// On short mobile viewports, fitting only to width still leaves a card
// taller than the visible screen, pushing the share/restart buttons off
// past the fold. Reserve this much vertical space for the title text and
// button row that render below CardScene, and fit the remainder to height too.
const VERTICAL_CHROME_RESERVE_PX = 420;

const MAX_TILT_DEG = 15;
const FLIP_DURATION_MS = 800;
const SPIN_DURATION_MS = 1000;
const TILT_ACTIVE_TRANSITION = '80ms linear';
const TILT_RESET_TRANSITION = '400ms ease-out';
const FLIP_TRANSITION = `transform ${FLIP_DURATION_MS}ms ease-out`;
const SPIN_TRANSITION = `transform ${SPIN_DURATION_MS}ms ease-in-out`;

export function CardScene({ discovererName, result, attrs }: CardSceneProps) {
  const [hasFlippedIn, setHasFlippedIn] = useState(false);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [transition, setTransition] = useState(FLIP_TRANSITION);
  const [spinDeg, setSpinDeg] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [naturalHeight, setNaturalHeight] = useState(0);

  const rarity = calculateRarity(attrs);
  const isLegendary = rarity === 'legendary';

  if (!hasFlippedIn) {
    // Triggers the flip-in transition on the first paint after mount.
    requestAnimationFrame(() => setHasFlippedIn(true));
  }

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current !== null) {
        clearTimeout(spinTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    function update() {
      if (!outer || !inner) return;
      const height = inner.offsetHeight;
      const widthScale = computeFitScale(outer.offsetWidth, CARD_NATURAL_WIDTH);
      const heightBudget = Math.max(200, window.innerHeight - VERTICAL_CHROME_RESERVE_PX);
      const heightScale = computeFitScale(heightBudget, height);
      setScale(Math.min(widthScale, heightScale));
      setNaturalHeight(height);
    }

    update();
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(outer);
    resizeObserver.observe(inner);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
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

  function handleTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    if (isSpinning) return;
    const touch = event.touches[0];
    if (!touch) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const next = clampTilt(touch.clientX, touch.clientY, rect, MAX_TILT_DEG);
    setTransition(TILT_ACTIVE_TRANSITION);
    setTilt(next);
  }

  function handleTouchEnd() {
    if (isSpinning) return;
    setTransition(TILT_RESET_TRANSITION);
    setTilt({ rotateX: 0, rotateY: 0 });
  }

  function handleSpinClick() {
    if (spinTimeoutRef.current !== null) {
      clearTimeout(spinTimeoutRef.current);
    }
    setIsSpinning(true);
    setHasFlippedIn(true);
    setTransition(SPIN_TRANSITION);
    setTilt({ rotateX: 0, rotateY: 0 });
    setSpinDeg((current) => current + 360);
    spinTimeoutRef.current = setTimeout(() => {
      spinTimeoutRef.current = null;
      setIsSpinning(false);
      setTransition(TILT_RESET_TRANSITION);
      setSpinDeg(0);
      setTilt({ rotateX: 0, rotateY: 0 });
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
          className="mx-auto"
          style={{
            width: CARD_NATURAL_WIDTH,
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
          }}
        >
          <div
            className="card-perspective"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            <div
              className={`card-flipper ${isLegendary ? 'card-glow-idle' : ''}`}
              style={{
                transform: `rotateX(${tilt.rotateX}deg) rotateY(${totalRotateY}deg)`,
                transition,
              }}
            >
              <div className="card-face">
                <Card discovererName={discovererName} result={result} attrs={attrs} />
              </div>
              <div className="card-face card-face-back">
                <img
                  src={CARD_BACK_PATH}
                  alt="Dino Discovery"
                  className="w-full h-full object-cover rounded-[28px] border-[20px] border-[#0a0a0a]"
                />
              </div>
            </div>
          </div>
        </div>
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
