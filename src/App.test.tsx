import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App attribute selection', () => {
  it('disables the discover button until all attributes and a name are set', async () => {
    render(<App />);
    const button = screen.getByRole('button', { name: /Descubrir/i });
    expect(button).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Gigante' }));
    await userEvent.click(screen.getByRole('button', { name: 'Volcán' }));
    await userEvent.click(screen.getByRole('button', { name: 'Carnívoro' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cuernos' }));
    await userEvent.click(screen.getByRole('button', { name: 'Feroz' }));
    expect(button).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/nombre/i), 'Lucía');
    expect(button).toBeEnabled();
  });
});
