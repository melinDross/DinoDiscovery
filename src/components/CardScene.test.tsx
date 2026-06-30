import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardScene, clampTilt, computeFitScale } from './CardScene';
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

describe('computeFitScale', () => {
  it('stays at 1 when the container is at least as wide as the card', () => {
    expect(computeFitScale(420, 420)).toBe(1);
    expect(computeFitScale(600, 420)).toBe(1);
  });

  it('shrinks proportionally when the container is narrower than the card', () => {
    expect(computeFitScale(210, 420)).toBe(0.5);
    expect(computeFitScale(378, 420)).toBeCloseTo(0.9, 5);
  });

  it('never returns more than 1, even with a degenerate natural width', () => {
    expect(computeFitScale(100, 0)).toBe(1);
  });
});

describe('CardScene', () => {
  it('renders the card content', () => {
    render(<CardScene discovererName="Lucía" result={result} attrs={commonAttrs} />);
    expect(screen.getByText('Volcanrex')).toBeInTheDocument();
  });

  it('tilts toward a touch point and springs back on touch end', () => {
    render(<CardScene discovererName="Lucía" result={result} attrs={commonAttrs} />);
    const perspective = document.querySelector('.card-perspective') as HTMLElement;
    const flipper = document.querySelector('.card-flipper') as HTMLElement;

    perspective.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 200, height: 200 }) as DOMRect;

    const baseline = flipper.style.transform;

    fireEvent.touchMove(perspective, { touches: [{ clientX: 200, clientY: 200 }] });
    expect(flipper.style.transform).not.toBe(baseline);

    fireEvent.touchEnd(perspective);
    expect(flipper.style.transform).toBe(baseline);
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
