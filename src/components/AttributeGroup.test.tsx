import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AttributeGroup } from './AttributeGroup';

describe('AttributeGroup', () => {
  it('renders the label and all options', () => {
    render(
      <AttributeGroup label="Tamaño" options={['Pequeño', 'Mediano', 'Gigante']} selected={null} onSelect={() => {}} />
    );
    expect(screen.getByText('Tamaño')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gigante' })).toBeInTheDocument();
  });

  it('marks the selected option as pressed', () => {
    render(
      <AttributeGroup
        label="Tamaño"
        options={['Pequeño', 'Mediano', 'Gigante']}
        selected="Mediano"
        onSelect={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: 'Mediano' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Pequeño' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onSelect with the clicked option', async () => {
    const onSelect = vi.fn();
    render(
      <AttributeGroup label="Tamaño" options={['Pequeño', 'Mediano', 'Gigante']} selected={null} onSelect={onSelect} />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Gigante' }));
    expect(onSelect).toHaveBeenCalledWith('Gigante');
  });
});
