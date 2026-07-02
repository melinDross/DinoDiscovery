import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import confetti from 'canvas-confetti';
import { ResultScreen } from './ResultScreen';
import type { GenerateDinoResponse, DinoAttributes } from '../../shared/types';

const result: GenerateDinoResponse = {
  resultId: 'result-1',
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

describe('ResultScreen', () => {
  it('shows the dino name, description and image', () => {
    render(<ResultScreen result={result} attrs={attrs} discovererName="Lucía" onDownloadClick={() => {}} onRestart={() => {}} />);
    expect(screen.getByText('Volcanrex')).toBeInTheDocument();
    expect(screen.getByText('Volcanius ferox')).toBeInTheDocument();
    expect(screen.getByText(result.description)).toBeInTheDocument();
    expect(screen.getByAltText('Volcanrex')).toHaveAttribute('src', '/images/abc.png');
  });

  it('fires confetti when the dino is revealed', () => {
    render(<ResultScreen result={result} attrs={attrs} discovererName="Lucía" onDownloadClick={() => {}} onRestart={() => {}} />);
    expect(confetti).toHaveBeenCalled();
  });

  it('calls onDownloadClick when the download button is clicked', async () => {
    const onDownloadClick = vi.fn();
    render(<ResultScreen result={result} attrs={attrs} discovererName="Lucía" onDownloadClick={onDownloadClick} onRestart={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /descargar carta/i }));
    expect(onDownloadClick).toHaveBeenCalled();
  });

  it('calls onRestart when "Detectar otra especie" is clicked', async () => {
    const onRestart = vi.fn();
    render(<ResultScreen result={result} attrs={attrs} discovererName="Lucía" onDownloadClick={() => {}} onRestart={onRestart} />);
    await userEvent.click(screen.getByRole('button', { name: /detectar otra especie/i }));
    expect(onRestart).toHaveBeenCalled();
  });

  it('shows the species ID and rarity', () => {
    render(<ResultScreen result={result} attrs={attrs} discovererName="Lucía" onDownloadClick={() => {}} onRestart={() => {}} />);
    expect(screen.getAllByText(/^DX-[0-9A-Z]{3}-[0-9A-Z]{3}$/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Raro').length).toBeGreaterThan(0);
  });

  it('announces the discovered dino to screen readers via an aria-live region', () => {
    render(<ResultScreen result={result} attrs={attrs} discovererName="Lucía" onDownloadClick={() => {}} onRestart={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('Volcanrex');
  });
});
