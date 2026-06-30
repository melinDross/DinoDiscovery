import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Landing } from './Landing';

describe('Landing', () => {
  it('shows the title, subtitle and start button', () => {
    render(<Landing onStart={() => {}} />);
    expect(screen.getByText('Dino')).toBeInTheDocument();
    expect(screen.getByText('Discovery')).toBeInTheDocument();
    expect(screen.getByText('Descubre tu propia especie única')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '¡Empezar!' })).toBeInTheDocument();
  });

  it('calls onStart when the button is clicked', async () => {
    const onStart = vi.fn();
    render(<Landing onStart={onStart} />);
    await userEvent.click(screen.getByRole('button', { name: '¡Empezar!' }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
