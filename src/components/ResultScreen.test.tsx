import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import confetti from 'canvas-confetti';
import { ResultScreen } from './ResultScreen';
import type { GenerateDinoResponse } from '../../shared/types';

vi.mock('../certificate', () => ({ shareDinoImage: vi.fn().mockResolvedValue(undefined) }));

import { shareDinoImage } from '../certificate';

const result: GenerateDinoResponse = {
  resultId: 'result-1',
  scientificName: 'Volcanius ferox',
  commonName: 'Volcanrex',
  description: 'Un dinosaurio feroz que vive en volcanes.',
  imageUrl: '/images/abc.png',
};

describe('ResultScreen', () => {
  it('shows the dino name, description and image', () => {
    render(<ResultScreen result={result} onDownloadClick={() => {}} onRestart={() => {}} />);
    expect(screen.getByText('Volcanrex')).toBeInTheDocument();
    expect(screen.getByText('Volcanius ferox')).toBeInTheDocument();
    expect(screen.getByText(result.description)).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/images/abc.png');
  });

  it('fires confetti when the dino is revealed', () => {
    render(<ResultScreen result={result} onDownloadClick={() => {}} onRestart={() => {}} />);
    expect(confetti).toHaveBeenCalled();
  });

  it('calls onDownloadClick when the download button is clicked', async () => {
    const onDownloadClick = vi.fn();
    render(<ResultScreen result={result} onDownloadClick={onDownloadClick} onRestart={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /descargar certificado/i }));
    expect(onDownloadClick).toHaveBeenCalled();
  });

  it('shares the dino image when the share button is clicked', async () => {
    render(<ResultScreen result={result} onDownloadClick={() => {}} onRestart={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /compartir dinosaurio/i }));
    expect(shareDinoImage).toHaveBeenCalledWith('/images/abc.png', 'dino-volcanrex.png', 'Volcanrex');
  });

  it('calls onRestart when "Crear otro dinosaurio" is clicked', async () => {
    const onRestart = vi.fn();
    render(<ResultScreen result={result} onDownloadClick={() => {}} onRestart={onRestart} />);
    await userEvent.click(screen.getByRole('button', { name: /crear otro dinosaurio/i }));
    expect(onRestart).toHaveBeenCalled();
  });
});
