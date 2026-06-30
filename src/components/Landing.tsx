import { useRef } from 'react';

interface LandingProps {
  onStart: () => void;
}

const ROAR_START_SECONDS = 8;

export function Landing({ onStart }: LandingProps) {
  // React doesn't reliably serialize the `muted` prop to the real DOM
  // attribute, and iOS Safari won't autoplay a video that isn't muted at
  // the DOM level — so we set it imperatively via a ref callback.
  const videoRef = useRef<HTMLVideoElement>(null);
  const roarRef = useRef<HTMLAudioElement>(null);

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
      <button
        type="button"
        onClick={handleVideoTap}
        aria-label="Reproducir rugido"
        className="relative mb-3 sm:mb-4 w-52 sm:w-72 md:w-80 rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(178,255,0,0.20),0_8px_32px_rgba(0,0,0,0.6)] ring-2 ring-accent/30 active:scale-95 transition-transform"
      >
        <video
          ref={(el) => {
            (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
            if (el) {
              el.muted = true;
              // play() exists but may return undefined in test environments
              // (jsdom) rather than a Promise — guard before calling .catch().
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
      </button>
      {/* The video plays once on load (no loop) and stops on its last frame.
          Tapping it replays the video from the start and plays this roar
          audio from 8s in (skipping the file's lead-in) to the end, together
          — so the dino "reacts" to being tapped, as many times as tapped.
          Browsers block audio autoplay without a direct user gesture, so the
          roar can't fire on page load alongside the (muted) video. */}
      <audio ref={roarRef} src="/t-rex-sound.mp3" preload="auto" />
      <h1 className="font-display text-4xl sm:text-5xl md:text-6xl leading-tight tracking-[5px] uppercase">
        <span className="block text-cream">Dino</span>
        <span className="block text-accent [text-shadow:0_0_40px_rgba(178,255,0,0.4)]">
          Discovery
        </span>
      </h1>
      <p className="mt-3 sm:mt-4 text-sm sm:text-base uppercase tracking-[2px] text-sage">
        Descubre tu propia especie única
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-6 sm:mt-8 w-full max-w-xs sm:max-w-sm px-6 py-3 sm:py-4 text-bg font-display text-xl uppercase tracking-[2px] bg-accent hover:shadow-[6px_6px_0_0_#f5e6c8] transition-shadow"
      >
        ¡Empezar!
      </button>
    </div>
  );
}
