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

  it('shows the brand title bar with the emblem image', () => {
    render(<Card discovererName="Lucía" result={result} attrs={attrs} />);
    expect(screen.getByText('Dino Discovery')).toBeInTheDocument();
    expect(screen.getByAltText('Dino Discovery')).toHaveAttribute(
      'src',
      '/icons/medallions/emblem.png'
    );
  });

  it('composites the habitat background behind the dino image', () => {
    render(<Card discovererName="Lucía" result={result} attrs={attrs} />);
    expect(screen.getByAltText('Entorno: Volcán')).toHaveAttribute('src', '/habitats/volcan.png');
    expect(screen.getByAltText('Volcanrex')).toHaveAttribute('src', '/images/abc.png');
  });

  it('shows all 5 attribute medallions with their icon, label and value', () => {
    render(<Card discovererName="Lucía" result={result} attrs={attrs} />);
    expect(screen.getByAltText('Tamaño: Gigante')).toHaveAttribute(
      'src',
      '/icons/medallions/gigante.png'
    );
    expect(screen.getByAltText('Dieta: Carnívoro')).toHaveAttribute(
      'src',
      '/icons/medallions/carnivoro.png'
    );
    expect(screen.getByAltText('Característica: Cuernos')).toHaveAttribute(
      'src',
      '/icons/medallions/cuernos.png'
    );
    expect(screen.getByAltText('Personalidad: Feroz')).toHaveAttribute(
      'src',
      '/icons/medallions/feroz.png'
    );
    expect(screen.getByAltText('Hábitat: Volcán')).toHaveAttribute(
      'src',
      '/icons/medallions/volcan.png'
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
