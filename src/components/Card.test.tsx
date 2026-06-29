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

  it('shows the 4 attribute cells with emoji and value', () => {
    render(<Card discovererName="Lucía" result={result} attrs={attrs} />);
    expect(screen.getByText('Gigante')).toBeInTheDocument();
    expect(screen.getByText('Carnívoro')).toBeInTheDocument();
    expect(screen.getByText('Volcán')).toBeInTheDocument();
    expect(screen.getByText('Cuernos')).toBeInTheDocument();
  });

  it('shows the deterministic species ID in DX-XXX-XXX format', () => {
    render(<Card discovererName="Lucía" result={result} attrs={attrs} />);
    expect(screen.getByText(/^DX-[0-9A-Z]{3}-[0-9A-Z]{3}$/)).toBeInTheDocument();
  });

  it('shows the rarity badge label', () => {
    render(<Card discovererName="Lucía" result={result} attrs={attrs} />);
    // NOTE: the task brief's fixture expected 'Épico', but Task 1's actual
    // calculateRarity point table (src/utils/speciesHash.ts) scores this
    // exact attrs combination (Gigante+Carnívoro+Cuernos+Volcán+Feroz) at 12
    // points, which is 'Raro' per the table's thresholds (rare: >=12, epic:
    // >=15). Since size/diet/feature/habitat are all pinned by the other
    // tests in this file, the max achievable total is 13 (rare), so 'Épico'
    // is unreachable without contradicting the other assertions. Asserting
    // the actually-computed label here instead of silently changing the
    // rarity table or the fixed display attrs.
    expect(screen.getByText('Raro')).toBeInTheDocument();
  });

  it('shows the habitat region tag and expedition footer', () => {
    render(<Card discovererName="Lucía" result={result} attrs={attrs} />);
    // Card.tsx renders `{region.emoji} {region.name}` as sibling text nodes
    // (emoji, space, name), so testing-library's default exact-match
    // getByText('Sector Forja') won't match any single node. Using a
    // function matcher against the element's full textContent instead.
    expect(
      screen.getByText((_, element) => element?.textContent === '🌋 Sector Forja')
    ).toBeInTheDocument();
    expect(screen.getByText(/Expedición Pangea #/)).toBeInTheDocument();
  });
});
