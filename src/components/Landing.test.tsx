import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Landing } from './Landing';

describe('Landing', () => {
  it('shows the title, subtitle and start button', () => {
    render(<Landing onStart={() => {}} />);
    expect(screen.getByAltText('Dino Discovery')).toBeInTheDocument();
    expect(screen.getByText(/descubiertas/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '¡Comienza a explorar!' })).toBeInTheDocument();
  });

  it('calls onStart when the button is clicked', async () => {
    const onStart = vi.fn();
    render(<Landing onStart={onStart} />);
    await userEvent.click(screen.getByRole('button', { name: '¡Comienza a explorar!' }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
