import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { GenerateDinoResponse, DinoAttributes } from '../../shared/types';
import { CardScene } from './CardScene';

interface ResultScreenProps {
  result: GenerateDinoResponse;
  attrs: DinoAttributes;
  discovererName: string;
  onDownloadClick: () => void;
  onRestart: () => void;
}

export function ResultScreen({ result, attrs, discovererName, onDownloadClick, onRestart }: ResultScreenProps) {
  useEffect(() => {
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
  }, []);

  return (
    <div className="min-h-screen flex items-start justify-center pt-4 pb-8 px-4">
      <div className="max-w-xl w-full text-center">
        <CardScene discovererName={discovererName} result={result} attrs={attrs} />
        <div className="mt-3 flex flex-wrap gap-3 justify-center">
          <button
            type="button"
            onClick={onDownloadClick}
            className="px-6 py-3 min-h-[44px] text-white font-display2 font-semibold uppercase tracking-wide rounded-[999px] bg-brand hover:shadow-[6px_6px_0_0_#f5e6c8] transition-shadow"
          >
            Descargar carta
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="px-6 py-3 min-h-[44px] text-brand font-display2 font-semibold uppercase tracking-wide rounded-[999px] border border-brand/40 hover:border-brand transition-colors"
          >
            Detectar otra especie
          </button>
        </div>
      </div>
    </div>
  );
}
