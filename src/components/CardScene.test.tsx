import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardScene, clampTilt } from './CardScene';
import type { GenerateDinoResponse, DinoAttributes } from '../../shared/types';

const result: GenerateDinoResponse = {
  resultId: 'result-1-abcd',
  scientificName: 'Volcanius ferox',
  commonName: 'Volcanrex',
  description: 'Un dinosaurio feroz.',
  imageUrl: '/images/abc.png',
};

const legendaryAttrs: DinoAttributes = {
  size: 'Coloso',
  habitat: 'Ártico',
  diet: 'Oófago',
  feature: 'Alas',
  personality: 'Sigiloso',
};

const commonAttrs: DinoAttributes = {
  size: 'Mediano',
  habitat: 'Selva',
  diet: 'Herbívoro',
  feature: 'Escamas coloridas',
  personality: 'Amigable',
};

describe('clampTilt', () => {
  it('returns zero rotation at the exact center', () => {
    const rect = { left: 0, top: 0, width: 200, height: 200 } as DOMRect;
    expect(clampTilt(100, 100, rect, 15)).toEqual({ rotateX: 0, rotateY: 0 });
  });

  it('clamps to the max degrees at the edges', () => {
    const rect = { left: 0, top: 0, width: 200, height: 200 } as DOMRect;
    const result = clampTilt(200, 200, rect, 15);
    expect(Math.abs(result.rotateX)).toBeLessThanOrEqual(15);
    expect(Math.abs(result.rotateY)).toBeLessThanOrEqual(15);
  });
});

describe('CardScene', () => {
  it('renders the card content', () => {
    render(<CardScene discovererName="Lucía" result={result} attrs={commonAttrs} />);
    expect(screen.getByText('Volcanrex')).toBeInTheDocument();
  });

  it('applies the idle glow class only for legendary rarity', () => {
    const { rerender } = render(
      <CardScene discovererName="Lucía" result={result} attrs={commonAttrs} />
    );
    expect(document.querySelector('.card-glow-idle')).not.toBeInTheDocument();

    rerender(<CardScene discovererName="Lucía" result={result} attrs={legendaryAttrs} />);
    expect(document.querySelector('.card-glow-idle')).toBeInTheDocument();
  });

  it('spins the card 360 degrees when the rotate button is clicked', async () => {
    render(<CardScene discovererName="Lucía" result={result} attrs={commonAttrs} />);
    const button = screen.getByRole('button', { name: /girar carta/i });
    fireEvent.click(button);
    const flipper = document.querySelector('.card-flipper') as HTMLElement;
    expect(flipper.style.transform).toContain('360deg');
  });
});
