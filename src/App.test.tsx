import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

vi.mock('./api', () => ({
  generateDino: vi.fn(),
  subscribeEmail: vi.fn(),
  fetchResult: vi.fn(),
  RateLimitError: class RateLimitError extends Error {},
  DinoApiError: class DinoApiError extends Error {},
}));
vi.mock('./certificate', () => ({
  captureCertificateAsPng: vi.fn().mockResolvedValue(undefined),
}));

import { generateDino, subscribeEmail, fetchResult, RateLimitError } from './api';
import { captureCertificateAsPng } from './certificate';

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('App wizard flow', () => {
  beforeEach(() => {
    vi.mocked(generateDino).mockReset();
    vi.mocked(subscribeEmail).mockReset();
    vi.mocked(fetchResult).mockReset();
    vi.mocked(captureCertificateAsPng).mockClear();
    window.history.pushState(null, '', '/');
  });

  it('shows the landing page first, then the name step after clicking ¡Comienza a explorar!', async () => {
    render(<App />);
    expect(screen.getByAltText('Dino Discovery')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '¡Comienza a explorar!' }));
    expect(screen.getByLabelText('Tu nombre')).toBeInTheDocument();
  });

  it(
    'walks through all 6 wizard steps and triggers generation on the last selection',
    async () => {
      vi.mocked(generateDino).mockResolvedValue({
        resultId: 'result-1',
        scientificName: 'Volcanius ferox',
        commonName: 'Volcanrex',
        description: 'Un dinosaurio feroz que vive en volcanes.',
        imageUrl: '/images/abc.png',
      });

      render(<App />);
      await userEvent.click(screen.getByRole('button', { name: '¡Comienza a explorar!' }));

      await userEvent.type(screen.getByLabelText('Tu nombre'), 'Lucía');
      await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

      await userEvent.click(screen.getByRole('button', { name: 'Gigante' }));
      await wait(550);
      await userEvent.click(screen.getByRole('button', { name: 'Volcán' }));
      await wait(550);
      await userEvent.click(screen.getByRole('button', { name: 'Carnívoro' }));
      await wait(550);
      await userEvent.click(screen.getByRole('button', { name: 'Cuernos' }));
      await wait(550);
      await userEvent.click(screen.getByRole('button', { name: 'Feroz' }));
      await wait(550);

      expect(generateDino).toHaveBeenCalledWith({
        size: 'Gigante',
        habitat: 'Volcán',
        diet: 'Carnívoro',
        feature: 'Cuernos',
        personality: 'Feroz',
        discovererName: 'Lucía',
      });

      expect(screen.queryByRole('heading', { name: 'Volcanrex' })).not.toBeInTheDocument();
      // Querying by heading role (not findByText) because the off-screen
      // Certificate (kept mounted for html2canvas capture) also renders the
      // dino's commonName as a <p>, so a plain text query matches twice.
      expect(
        await screen.findByRole('heading', { name: 'Volcanrex' }, { timeout: 2000 })
      ).toBeInTheDocument();
    },
    10000
  );

  it('lets the user go back a step without losing the previously entered name', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: '¡Comienza a explorar!' }));
    await userEvent.type(screen.getByLabelText('Tu nombre'), 'Lucía');
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(screen.getByRole('button', { name: 'Gigante' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Atrás' }));

    expect(screen.getByDisplayValue('Lucía')).toBeInTheDocument();
  });

  it('does not skip a screen when two options on the same step are clicked in quick succession', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: '¡Comienza a explorar!' }));
    await userEvent.type(screen.getByLabelText('Tu nombre'), 'Lucía');
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    await userEvent.click(screen.getByRole('button', { name: 'Mediano' }));
    await userEvent.click(screen.getByRole('button', { name: 'Gigante' }));
    await wait(600);

    expect(screen.getByText('Hábitat')).toBeInTheDocument();
  });

  it('cancels a pending auto-advance when the user navigates back before it fires', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: '¡Comienza a explorar!' }));
    await userEvent.type(screen.getByLabelText('Tu nombre'), 'Lucía');
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    await userEvent.click(screen.getByRole('button', { name: 'Gigante' }));
    await userEvent.click(screen.getByRole('button', { name: 'Atrás' }));
    await wait(600);

    expect(screen.getByLabelText('Tu nombre')).toBeInTheDocument();
  });

  it(
    'does not trigger generation twice when two personality options are clicked in quick succession',
    async () => {
      vi.mocked(generateDino).mockResolvedValue({
        resultId: 'result-1',
        scientificName: 'Volcanius ferox',
        commonName: 'Volcanrex',
        description: 'Un dinosaurio feroz que vive en volcanes.',
        imageUrl: '/images/abc.png',
      });

      render(<App />);
      await userEvent.click(screen.getByRole('button', { name: '¡Comienza a explorar!' }));
      await userEvent.type(screen.getByLabelText('Tu nombre'), 'Lucía');
      await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

      await userEvent.click(screen.getByRole('button', { name: 'Gigante' }));
      await wait(550);
      await userEvent.click(screen.getByRole('button', { name: 'Volcán' }));
      await wait(550);
      await userEvent.click(screen.getByRole('button', { name: 'Carnívoro' }));
      await wait(550);
      await userEvent.click(screen.getByRole('button', { name: 'Cuernos' }));
      await wait(550);

      await userEvent.click(screen.getByRole('button', { name: 'Feroz' }));
      await userEvent.click(screen.getByRole('button', { name: 'Amigable' }));
      await wait(600);

      await screen.findByRole('heading', { name: 'Volcanrex' }, { timeout: 2000 });
      expect(generateDino).toHaveBeenCalledTimes(1);
      expect(generateDino).toHaveBeenCalledWith(
        expect.objectContaining({ personality: 'Amigable' })
      );
    },
    10000
  );

  it('loads a result directly from a /r/:id URL on mount', async () => {
    vi.mocked(fetchResult).mockResolvedValue({
      scientificName: 'Volcanius ferox',
      commonName: 'Volcanrex',
      description: 'Un dinosaurio feroz que vive en volcanes.',
      imageUrl: '/images/abc.png',
      discovererName: 'Lucía',
      attrs: { size: 'Gigante', habitat: 'Volcán', diet: 'Carnívoro', feature: 'Cuernos', personality: 'Feroz' },
    });
    window.history.pushState(null, '', '/r/result-1');

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Volcanrex' })).toBeInTheDocument();
    expect(fetchResult).toHaveBeenCalledWith('result-1');
  });

  it('shows the email gate form when clicking download', async () => {
    vi.mocked(fetchResult).mockResolvedValue({
      scientificName: 'Volcanius ferox',
      commonName: 'Volcanrex',
      description: 'Un dinosaurio feroz que vive en volcanes.',
      imageUrl: '/images/abc.png',
      discovererName: 'Lucía',
      attrs: { size: 'Gigante', habitat: 'Volcán', diet: 'Carnívoro', feature: 'Cuernos', personality: 'Feroz' },
    });
    window.history.pushState(null, '', '/r/result-1');

    render(<App />);
    await screen.findByRole('heading', { name: 'Volcanrex' });
    await userEvent.click(screen.getByRole('button', { name: /descargar carta/i }));

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(captureCertificateAsPng).not.toHaveBeenCalled();
  });

  it('subscribes the email in Kit and downloads the certificate immediately, without waiting for confirmation', async () => {
    vi.mocked(fetchResult).mockResolvedValue({
      scientificName: 'Volcanius ferox',
      commonName: 'Volcanrex',
      description: 'Un dinosaurio feroz que vive en volcanes.',
      imageUrl: '/images/abc.png',
      discovererName: 'Lucía',
      attrs: { size: 'Gigante', habitat: 'Volcán', diet: 'Carnívoro', feature: 'Cuernos', personality: 'Feroz' },
    });
    vi.mocked(subscribeEmail).mockResolvedValue(undefined);
    window.history.pushState(null, '', '/r/result-1');

    render(<App />);
    await screen.findByRole('heading', { name: 'Volcanrex' });
    await userEvent.click(screen.getByRole('button', { name: /descargar carta/i }));
    await userEvent.type(screen.getByLabelText(/email/i), 'nina@example.com');
    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(subscribeEmail).toHaveBeenCalledWith('result-1', 'nina@example.com');
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    expect(captureCertificateAsPng).toHaveBeenCalledTimes(1);
  });

  it('still downloads the certificate even if subscribing to Kit fails', async () => {
    vi.mocked(fetchResult).mockResolvedValue({
      scientificName: 'Volcanius ferox',
      commonName: 'Volcanrex',
      description: 'Un dinosaurio feroz que vive en volcanes.',
      imageUrl: '/images/abc.png',
      discovererName: 'Lucía',
      attrs: { size: 'Gigante', habitat: 'Volcán', diet: 'Carnívoro', feature: 'Cuernos', personality: 'Feroz' },
    });
    vi.mocked(subscribeEmail).mockRejectedValue(new RateLimitError(120));
    window.history.pushState(null, '', '/r/result-1');

    render(<App />);
    await screen.findByRole('heading', { name: 'Volcanrex' });
    await userEvent.click(screen.getByRole('button', { name: /descargar carta/i }));
    await userEvent.type(screen.getByLabelText(/email/i), 'nina@example.com');
    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(captureCertificateAsPng).toHaveBeenCalledTimes(1);
  });
});
