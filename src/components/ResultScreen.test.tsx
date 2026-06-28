import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResultScreen } from './ResultScreen';
import type { GenerateDinoResponse } from '../../shared/types';

const result: GenerateDinoResponse = {
  scientificName: 'Volcanius ferox',
  commonName: 'Volcanrex',
  description: 'Un dinosaurio feroz que vive en volcanes.',
  imageUrl: '/images/abc.png',
};

describe('ResultScreen', () => {
  it('shows the dino name, description and image', () => {
    render(<ResultScreen result={result} onDownloadClick={() => {}} />);
    expect(screen.getByText('Volcanrex')).toBeInTheDocument();
    expect(screen.getByText('Volcanius ferox')).toBeInTheDocument();
    expect(screen.getByText(result.description)).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/images/abc.png');
  });

  it('calls onDownloadClick when the download button is clicked', async () => {
    const onDownloadClick = vi.fn();
    render(<ResultScreen result={result} onDownloadClick={onDownloadClick} />);
    await userEvent.click(screen.getByRole('button', { name: /descargar certificado/i }));
    expect(onDownloadClick).toHaveBeenCalled();
  });
});
