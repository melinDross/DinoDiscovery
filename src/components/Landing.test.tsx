import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Landing } from './Landing';

describe('Landing', () => {
  it('shows the title, subtitle and start button', () => {
    render(<Landing onStart={() => {}} />);
    expect(screen.getByText('Dino Discovery Generator')).toBeInTheDocument();
    expect(screen.getByText('¡Crea tu propio dinosaurio único!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '¡Empezar!' })).toBeInTheDocument();
  });

  it('calls onStart when the button is clicked', async () => {
    const onStart = vi.fn();
    render(<Landing onStart={onStart} />);
    await userEvent.click(screen.getByRole('button', { name: '¡Empezar!' }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
