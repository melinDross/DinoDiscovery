import type { GenerateDinoResponse } from '../../shared/types';

interface ResultScreenProps {
  result: GenerateDinoResponse;
  onDownloadClick: () => void;
}

export function ResultScreen({ result, onDownloadClick }: ResultScreenProps) {
  return (
    <div className="max-w-xl mx-auto text-center">
      <img
        src={result.imageUrl}
        alt={result.commonName}
        className="w-64 h-64 object-contain mx-auto rounded-xl bg-white shadow-md"
      />
      <h2 className="text-2xl font-bold text-purple-700 mt-4">{result.commonName}</h2>
      <p className="italic text-gray-600">{result.scientificName}</p>
      <p className="mt-3 text-gray-800">{result.description}</p>
      <button
        type="button"
        onClick={onDownloadClick}
        className="mt-6 px-6 py-3 rounded-full text-white font-bold bg-orange-500 hover:bg-orange-600"
      >
        Descargar certificado
      </button>
    </div>
  );
}
