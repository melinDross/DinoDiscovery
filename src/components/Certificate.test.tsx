import { createRef } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Certificate } from './Certificate';
import type { GenerateDinoResponse } from '../../shared/types';

const result: GenerateDinoResponse = {
  resultId: 'result-1',
  scientificName: 'Volcanius ferox',
  commonName: 'Volcanrex',
  description: 'Un dinosaurio feroz que vive en volcanes.',
  imageUrl: '/images/abc.png',
};

describe('Certificate', () => {
  it('shows the discoverer name, dino names, description and date', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Certificate ref={ref} discovererName="Lucía" result={result} />);

    expect(screen.getByText('Lucía')).toBeInTheDocument();
    expect(screen.getByText('Volcanrex')).toBeInTheDocument();
    expect(screen.getByText('Volcanius ferox')).toBeInTheDocument();
    expect(screen.getByText(result.description)).toBeInTheDocument();
  });
});
