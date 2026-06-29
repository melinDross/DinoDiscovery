import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WizardShell } from './WizardShell';

vi.mock('../sound', () => ({ playClickSound: vi.fn() }));

import { playClickSound } from '../sound';

describe('WizardShell', () => {
  it('renders a progress bar reflecting the current step out of the total', () => {
    render(
      <WizardShell step={2} totalSteps={6} onBack={() => {}}>
        <p>contenido</p>
      </WizardShell>
    );
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33');
  });

  it('calls onBack when the back button is clicked', async () => {
    const onBack = vi.fn();
    render(
      <WizardShell step={1} totalSteps={6} onBack={onBack}>
        <p>contenido</p>
      </WizardShell>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Atrás' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(playClickSound).toHaveBeenCalled();
  });

  it('renders the children content', () => {
    render(
      <WizardShell step={1} totalSteps={6} onBack={() => {}}>
        <p>Paso de prueba</p>
      </WizardShell>
    );
    expect(screen.getByText('Paso de prueba')).toBeInTheDocument();
  });
});
