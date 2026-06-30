import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { shareDinoImage } from '../certificate';
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

  function handleShareClick() {
    const fileName = `dino-${result.commonName.toLowerCase().replace(/\s+/g, '-')}.png`;
    void shareDinoImage(result.imageUrl, fileName, result.commonName);
  }

  return (
    <div className="min-h-screen flex items-start justify-center pt-4 pb-8 px-4">
      <div className="max-w-xl w-full text-center">
        <CardScene discovererName={discovererName} result={result} attrs={attrs} />
        <div className="mt-3 flex flex-wrap gap-3 justify-center">
          <button
            type="button"
            onClick={onDownloadClick}
            className="px-6 py-3 min-h-[44px] text-bg font-display uppercase tracking-wide bg-accent hover:shadow-[6px_6px_0_0_#f5e6c8] transition-shadow"
          >
            Descargar carta
          </button>
          <button
            type="button"
            onClick={handleShareClick}
            className="px-6 py-3 min-h-[44px] text-accent font-display uppercase tracking-wide border border-accent/40 hover:border-accent transition-colors"
          >
            Compartir dinosaurio
          </button>
        </div>
        <button
          type="button"
          onClick={onRestart}
          className="mt-2 px-4 py-2 min-h-[44px] text-sage font-display uppercase tracking-wide text-sm hover:text-cream transition-colors"
        >
          Detectar otra especie
        </button>
      </div>
    </div>
  );
}
