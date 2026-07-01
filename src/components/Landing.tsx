import { useEffect, useRef, useState } from 'react';

interface LandingProps {
  onStart: () => void;
}

const ROAR_START_SECONDS = 8;
const APP_VERSION = 'v0.5';

// Flavor stat only (not real data) — starts here and ticks up slowly while
// the landing screen is open, to feel like a living discovery counter.
const DISCOVERY_COUNT_BASE = 2847;
const DISCOVERY_COUNT_INTERVAL_MS = 4000;

function formatDiscoveryCount(n: number): string {
  const padded = String(n).padStart(6, '0');
  return `${padded.slice(0, 3)},${padded.slice(3)}`;
}

export function Landing({ onStart }: LandingProps) {
  // React doesn't reliably serialize the `muted` prop to the real DOM
  // attribute, and iOS Safari won't autoplay a video that isn't muted at
  // the DOM level — so we set it imperatively via a ref callback.
  const videoRef = useRef<HTMLVideoElement>(null);
  const roarRef = useRef<HTMLAudioElement>(null);
  const [discoveryCount, setDiscoveryCount] = useState(DISCOVERY_COUNT_BASE);

  useEffect(() => {
    const id = setInterval(() => {
      setDiscoveryCount((c) => c + 1);
    }, DISCOVERY_COUNT_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  function handleVideoTap() {
    const audio = roarRef.current;
    if (audio) {
      audio.currentTime = ROAR_START_SECONDS;
      const audioPlay = typeof audio.play === 'function' ? audio.play() : undefined;
      if (audioPlay && typeof audioPlay.catch === 'function') audioPlay.catch(() => {});
    }

    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      const videoPlay = typeof video.play === 'function' ? video.play() : undefined;
      if (videoPlay && typeof videoPlay.catch === 'function') videoPlay.catch(() => {});
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <div className="relative w-52 sm:w-72 md:w-80 p-2">
        {/* Faux rarity-card silhouettes peeking from behind the video,
            tilted, hinting at the collectible-card payoff before the
            wizard even starts. CSS-only — not the real Card component. */}
        <div
          className="absolute inset-2 rounded-3xl opacity-40 blur-[1px] pointer-events-none"
          style={{
            transform: 'rotate(-14deg) translate(-14%, 6%)',
            background:
              'linear-gradient(135deg, rgba(236,26,143,0.5), rgba(178,255,0,0.3), rgba(255,200,80,0.4))',
            border: '3px solid rgba(255,255,255,0.15)',
          }}
        />
        <div
          className="absolute inset-2 rounded-3xl opacity-50 blur-[0.5px] pointer-events-none"
          style={{
            transform: 'rotate(11deg) translate(13%, 4%)',
            background:
              'linear-gradient(135deg, rgba(178,255,0,0.35), rgba(236,26,143,0.4), rgba(120,180,255,0.3))',
            border: '3px solid rgba(255,255,255,0.15)',
          }}
        />

        <button
          type="button"
          onClick={handleVideoTap}
          aria-label="Reproducir rugido"
          className="relative z-0 w-full active:scale-95 transition-transform"
        >
          <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-brand/70 z-10" />
          <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-brand/70 z-10" />
          <span className="absolute -top-2 -right-2 bg-brand text-white text-[10px] font-display2 font-bold px-2 py-0.5 rounded-full rotate-6 z-20">
            NUEVO
          </span>
          <div className="relative rounded-xl overflow-hidden shadow-[0_0_40px_rgba(236,26,143,0.20),0_8px_32px_rgba(0,0,0,0.6)]">
            <video
              ref={(el) => {
                (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
                if (el) {
                  el.muted = true;
                  // play() exists but may return undefined in test
                  // environments (jsdom) rather than a Promise — guard
                  // before calling .catch().
                  const p = typeof el.play === 'function' ? el.play() : undefined;
                  if (p && typeof p.catch === 'function') p.catch(() => {});
                }
              }}
              src="/dino-landing.mp4"
              autoPlay
              muted
              playsInline
              className="w-full h-auto block pointer-events-none"
            />
            {/* Progressive blur over just the video's base (not the card
                silhouettes above/behind it), so the hard edge where the
                logo now overlaps 35% of the clip blends smoothly instead
                of looking like a straight cut. A mask-image fades the
                backdrop-blur's opacity from 0 at its own top to 1 at the
                very bottom, so the blur strengthens gradually rather than
                snapping on at a hard line. */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] backdrop-blur-md"
              style={{
                WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 85%)',
                maskImage: 'linear-gradient(to bottom, transparent, black 85%)',
              }}
            />
          </div>
        </button>
      </div>

      {/* Wordmark — a real alpha-transparent PNG, at its original (wider
          than the video box) natural width, not clamped to match the
          video's narrower column. Pulled up with a negative top margin so
          it sits *in front* of the video (z-10 vs the video's z-0) and
          covers roughly the bottom 35% of it — reads as the dino bursting
          up from behind the wordmark rather than two stacked, separate
          images. -mt-[73px]/[101px]/[112px] approximate 35% of the
          video's own rendered height at each breakpoint (w-52/w-72/w-80
          above), since the clip is close to 1:1 aspect. */}
      <img
        src="/dino-discovery-logo.png"
        alt="Dino Discovery"
        className="relative z-10 -mt-[73px] sm:-mt-[101px] md:-mt-[112px] w-full max-w-xs sm:max-w-sm md:max-w-md"
      />
      {/* The video plays once on load (no loop) and stops on its last frame.
          Tapping it replays the video from the start and plays this roar
          audio from 8s in (skipping the file's lead-in) to the end, together
          — so the dino "reacts" to being tapped, as many times as tapped.
          Browsers block audio autoplay without a direct user gesture, so the
          roar can't fire on page load alongside the (muted) video. */}
      <audio ref={roarRef} src="/t-rex-sound.mp3" preload="auto" />
      {/* Two-line caption: a fixed tagline, then the live discovery
          counter — a flavor stat, not real data, that ticks up slowly
          while this screen is open to feel like a living ARG rather than
          a static tally. */}
      <p className="mt-1 sm:mt-2 text-sm sm:text-base uppercase tracking-[2px] text-sage font-body">
        Cada carta es una especie única
      </p>
      <p className="text-sm sm:text-base uppercase tracking-[2px] text-sage font-body">
        #{formatDiscoveryCount(discoveryCount)} descubiertas
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-6 sm:mt-8 w-full max-w-xs sm:max-w-sm px-6 py-3 sm:py-4 text-white font-display2 font-semibold text-base sm:text-xl uppercase tracking-[1px] sm:tracking-[2px] whitespace-nowrap rounded-[999px] bg-brand hover:shadow-[6px_6px_0_0_#f5e6c8] transition-shadow"
      >
        ¡Comienza a explorar!
      </button>
      <span className="mt-4 sm:mt-6 text-xs tracking-[2px] text-sage/50">
        {APP_VERSION}
      </span>
    </div>
  );
}
