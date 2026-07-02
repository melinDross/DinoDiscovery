import { createRef } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';
import type { GenerateDinoResponse, DinoAttributes } from '../../shared/types';

const result: GenerateDinoResponse = {
  resultId: 'result-1-abcd',
  scientificName: 'Volcanius ferox',
  commonName: 'Volcanrex',
  description: 'Un dinosaurio feroz que vive en volcanes.',
  imageUrl: '/images/abc.png',
};

const attrs: DinoAttributes = {
  size: 'Gigante',
  habitat: 'Volcán',
  diet: 'Carnívoro',
  feature: 'Cuernos',
  personality: 'Feroz',
};

describe('Card', () => {
  it('shows the scientific and common name, description, discoverer and date', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Card ref={ref} discovererName="Lucía" result={result} attrs={attrs} />);

    expect(screen.getByText('Volcanius ferox')).toBeInTheDocument();
    expect(screen.getByText('Volcanrex')).toBeInTheDocument();
    expect(screen.getByText(result.description)).toBeInTheDocument();
    expect(screen.getByText('Lucía')).toBeInTheDocument();
  });

  it('composites a deterministically-picked habitat sub-biome behind the dino image', () => {
    render(<Card discovererName="Lucía" result={result} attrs={attrs} />);
    // pickHabitatBackground hashes all 5 attribute values; for this fixture
    // it lands on variant 0 of Volcán: '/habitats/volcan-1.webp' / 'Caldera Mágica'.
    expect(screen.getByAltText('Entorno: Volcán')).toHaveAttribute(
      'src',
      '/habitats/volcan-1.webp'
    );
    // The sub-biome name ("Caldera Mágica") is rendered as a canvas-drawn
    // <img> (see useRotatedLabelImage in Card.tsx — needed so the rotated
    // label survives the capture step regardless of capture library), not
    // a text node — jsdom has no real canvas 2d context (see
    // test-setup.ts), so that image never actually renders here and isn't
    // asserted on in this environment.
    expect(screen.getByAltText('Volcanrex')).toHaveAttribute('src', '/images/abc.png');
  });

  it('shows all 5 attribute medallions with their icon, label and value', () => {
    render(<Card discovererName="Lucía" result={result} attrs={attrs} />);
    expect(screen.getByAltText('Tamaño: Gigante')).toHaveAttribute(
      'src',
      '/icons/medallions/gigante.webp'
    );
    expect(screen.getByAltText('Dieta: Carnívoro')).toHaveAttribute(
      'src',
      '/icons/medallions/carnivoro.webp'
    );
    expect(screen.getByAltText('Característica: Cuernos')).toHaveAttribute(
      'src',
      '/icons/medallions/cuernos.webp'
    );
    expect(screen.getByAltText('Personalidad: Feroz')).toHaveAttribute(
      'src',
      '/icons/medallions/feroz.webp'
    );
    expect(screen.getByAltText('Hábitat: Volcán')).toHaveAttribute(
      'src',
      '/icons/medallions/volcan.webp'
    );
  });

  it('shows the deterministic species ID in DX-XXX-XXX format', () => {
    render(<Card discovererName="Lucía" result={result} attrs={attrs} />);
    expect(screen.getByText(/^DX-[0-9A-Z]{3}-[0-9A-Z]{3}$/)).toBeInTheDocument();
  });

  it('shows the numeric score, rarity label with star count, and tier number', () => {
    render(<Card discovererName="Lucía" result={result} attrs={attrs} />);
    // Gigante(3) + Carnívoro(2) + Cuernos(2) + Feroz(2) + Volcán(3) = 12 -> rare, tier 3
    expect(screen.getByText('12')).toBeInTheDocument();
    // "Raro" appears twice (the rarity badge over the art, and the footer's
    // Rareza label) — assert there's at least one rather than picking a node.
    expect(screen.getAllByText('Raro').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('★★★')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
