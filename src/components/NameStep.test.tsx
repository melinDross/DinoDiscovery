// src/components/NameStep.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NameStep } from './NameStep';

describe('NameStep', () => {
  it('disables the next button when the name is empty or whitespace', () => {
    render(<NameStep value="   " onChange={() => {}} onNext={() => {}} />);
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });

  it('enables the next button when the name has content', () => {
    render(<NameStep value="Lucía" onChange={() => {}} onNext={() => {}} />);
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled();
  });

  it('calls onChange when typing', async () => {
    const onChange = vi.fn();
    render(<NameStep value="" onChange={onChange} onNext={() => {}} />);
    await userEvent.type(screen.getByLabelText('Tu nombre'), 'L');
    expect(onChange).toHaveBeenCalledWith('L');
  });

  it('calls onNext when the button is clicked', async () => {
    const onNext = vi.fn();
    render(<NameStep value="Lucía" onChange={() => {}} onNext={onNext} />);
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
