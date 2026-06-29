import { useEffect, useState } from 'react';

const STAGES = [
  { emoji: '🥚', message: 'Calentando el huevo...' },
  { emoji: '🥚', message: 'Algo se mueve dentro...' },
  { emoji: '🐣', message: 'Está a punto de salir...' },
  { emoji: '🦖', message: '¡Ya casi está aquí!' },
];

const STAGE_DURATION_MS = 1500;

export function LoadingDino() {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((current) => Math.min(current + 1, STAGES.length - 1));
    }, STAGE_DURATION_MS);
    return () => clearInterval(interval);
  }, []);

  const stage = STAGES[stageIndex];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-12" role="status">
      <div className="w-28 h-28 flex items-center justify-center border-2 border-accent/30 [box-shadow:0_0_30px_rgba(178,255,0,0.25)]">
        <div className="text-6xl animate-bounce">{stage.emoji}</div>
      </div>
      <p className="mt-6 font-display text-lg text-accent uppercase tracking-wide">{stage.message}</p>
    </div>
  );
}
