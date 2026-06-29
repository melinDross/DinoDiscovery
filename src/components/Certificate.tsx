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
        className="relative w-[800px] p-10 bg-bg border border-accent/20 text-center corner-brackets"
      >
        <div className="text-5xl mb-2">🏆</div>
        <h2 className="font-display text-3xl text-accent uppercase tracking-wide">
          Certificado Oficial de Descubrimiento
        </h2>
        <p className="mt-4 text-xl text-cream">
          Descubridor/a Oficial: <strong>{discovererName}</strong>
        </p>
        <img
          src={result.imageUrl}
          alt={result.commonName}
          className="w-48 h-48 object-contain mx-auto my-4"
        />
        <p className="font-display text-2xl text-cream uppercase tracking-wide">{result.commonName}</p>
        <p className="italic text-moss">{result.scientificName}</p>
        <p className="mt-4 text-sage">{result.description}</p>
        <p className="mt-4 text-sage">Fecha de descubrimiento: {discoveryDate}</p>
      </div>
    );
  }
);
Certificate.displayName = 'Certificate';
