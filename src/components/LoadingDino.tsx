import { useEffect, useState } from 'react';

export interface LoadingDinoProps {
  isDone: boolean;
  onTransitionEnd: () => void;
}

interface Phase {
  image: string;
  caption: string;
  animationClass: string;
}

const PHASES: Phase[] = [
  { image: '/loading/egg-1-intact.webp', caption: 'Señal detectada en el sector...', animationClass: 'animate-egg-breathe' },
  { image: '/loading/egg-2-wobble.webp', caption: 'Analizando secuencia de ADN fósil...', animationClass: 'animate-egg-wobble' },
  { image: '/loading/egg-3-crack.webp', caption: 'Especie no catalogada. Registrando...', animationClass: 'animate-egg-glow' },
  { image: '/loading/egg-4-broken-top.webp', caption: 'Preparando carta de descubrimiento...', animationClass: 'animate-egg-jitter' },
  { image: '/loading/egg-5-claws.webp', caption: 'Preparando carta de descubrimiento...', animationClass: 'animate-egg-tug' },
];

const BURST_PHASE: Phase = {
  image: '/loading/egg-6-burst.webp',
  caption: '¡Has descubierto una nueva especie!',
  animationClass: 'animate-egg-burst',
};

const PHASE_DURATION_MS = 4000;
const HELD_PHASE_INDEX = PHASES.length - 1;
const REASSURANCE_THRESHOLD_1_MS = 16000;
const REASSURANCE_THRESHOLD_2_MS = 24000;
const BURST_DURATION_MS = 600;
const TICK_MS = 1000;

export function calculateProgress(elapsedMs: number): number {
  const elapsedSeconds = elapsedMs / 1000;
  return 90 * (1 - Math.exp(-elapsedSeconds / 12));
}

function getCaption(phaseIndex: number, elapsedMs: number): string {
  if (phaseIndex !== HELD_PHASE_INDEX) {
    return PHASES[phaseIndex].caption;
  }
  if (elapsedMs >= REASSURANCE_THRESHOLD_2_MS) {
    return '¡Los mejores descubrimientos llevan su tiempo! Ya casi está...';
  }
  if (elapsedMs >= REASSURANCE_THRESHOLD_1_MS) {
    return 'Tu dinosaurio es un poco tímido, está tardando un poco más...';
  }
  return PHASES[phaseIndex].caption;
}

export function LoadingDino({ isDone, onTransitionEnd }: LoadingDinoProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (isDone) return;
    const interval = setInterval(() => {
      setElapsedMs((current) => current + TICK_MS);
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [isDone]);

  useEffect(() => {
    if (!isDone) return;
    const timeout = setTimeout(onTransitionEnd, BURST_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [isDone, onTransitionEnd]);

  if (isDone) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center py-12" role="status">
        <div className={`w-28 h-28 flex items-center justify-center ${BURST_PHASE.animationClass}`}>
          <img src={BURST_PHASE.image} alt={BURST_PHASE.caption} className="w-full h-full object-contain" />
        </div>
        <p className="mt-6 px-4 max-w-xs sm:max-w-sm text-center font-display2 font-semibold text-lg text-brand uppercase tracking-wide">
          {BURST_PHASE.caption}
        </p>
      </div>
    );
  }

  const phaseIndex = Math.min(Math.floor(elapsedMs / PHASE_DURATION_MS), HELD_PHASE_INDEX);
  const phase = PHASES[phaseIndex];
  const caption = getCaption(phaseIndex, elapsedMs);
  const progress = calculateProgress(elapsedMs);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-12" role="status">
      <div className={`w-28 h-28 flex items-center justify-center ${phase.animationClass}`}>
        <img src={phase.image} alt={caption} className="w-full h-full object-contain" />
      </div>
      <p className="mt-6 px-4 max-w-xs sm:max-w-sm text-center font-display2 font-semibold text-lg text-brand uppercase tracking-wide">
        {caption}
      </p>
      <div
        className="w-64 sm:w-80 h-2 mt-6 bg-[#1a1a1a] overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
