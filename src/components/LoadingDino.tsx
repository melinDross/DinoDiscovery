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
    <div className="flex flex-col items-center justify-center py-12" role="status">
      <div className="text-6xl animate-bounce">{stage.emoji}</div>
      <p className="mt-4 text-lg font-bold text-purple-700">{stage.message}</p>
    </div>
  );
}
