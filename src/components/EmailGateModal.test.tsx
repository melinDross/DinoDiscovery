import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmailGateModal } from './EmailGateModal';

describe('EmailGateModal', () => {
  it('shows an inline error for an invalid email and does not call onConfirm', async () => {
    const onConfirm = vi.fn();
    render(<EmailGateModal onConfirm={onConfirm} onCancel={() => {}} />);
    await userEvent.type(screen.getByLabelText(/email/i), 'not-an-email');
    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }));
    expect(screen.getByText(/correo válido/i)).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm with the email when valid', async () => {
    const onConfirm = vi.fn();
    render(<EmailGateModal onConfirm={onConfirm} onCancel={() => {}} />);
    await userEvent.type(screen.getByLabelText(/email/i), 'nina@example.com');
    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }));
    expect(onConfirm).toHaveBeenCalledWith('nina@example.com');
  });
});
