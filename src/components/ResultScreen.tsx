import type { GenerateDinoResponse } from '../../shared/types';

interface ResultScreenProps {
  result: GenerateDinoResponse;
  onDownloadClick: () => void;
}

export function ResultScreen({ result, onDownloadClick }: ResultScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-xl w-full text-center">
        <div className="relative w-48 h-48 sm:w-64 sm:h-64 md:w-72 md:h-72 mx-auto corner-brackets">
          <img
            src={result.imageUrl}
            alt={result.commonName}
            className="w-full h-full object-contain bg-surface2"
          />
        </div>
        <h2 className="mt-6 font-display text-2xl sm:text-3xl text-cream uppercase tracking-wide">
          {result.commonName}
        </h2>
        <p className="italic text-moss">{result.scientificName}</p>
        <p className="mt-3 text-sage">{result.description}</p>
        <button
          type="button"
          onClick={onDownloadClick}
          className="mt-6 px-6 py-3 text-bg font-display uppercase tracking-wide bg-accent hover:shadow-[6px_6px_0_0_#f5e6c8] transition-shadow"
        >
          Descargar certificado
        </button>
      </div>
    </div>
  );
}
