import { forwardRef } from 'react';
import type { GenerateDinoResponse } from '../../shared/types';

interface CertificateProps {
  discovererName: string;
  result: GenerateDinoResponse;
}

export const Certificate = forwardRef<HTMLDivElement, CertificateProps>(
  ({ discovererName, result }, ref) => {
    const discoveryDate = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return (
      <div
        ref={ref}
        className="w-[800px] p-10 bg-white border-8 border-yellow-500 text-center"
      >
        <div className="text-5xl mb-2">🏆</div>
        <h2 className="text-3xl font-bold text-purple-700">Certificado Oficial de Descubrimiento</h2>
        <p className="mt-4 text-xl">
          Descubridor/a Oficial: <strong>{discovererName}</strong>
        </p>
        <img
          src={result.imageUrl}
          alt={result.commonName}
          className="w-48 h-48 object-contain mx-auto my-4"
        />
        <p className="text-2xl font-bold text-purple-700">{result.commonName}</p>
        <p className="italic text-gray-600">{result.scientificName}</p>
        <p className="mt-4 text-gray-700">Fecha de descubrimiento: {discoveryDate}</p>
      </div>
    );
  }
);
Certificate.displayName = 'Certificate';
