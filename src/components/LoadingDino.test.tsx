import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LoadingDino } from './LoadingDino';

describe('LoadingDino', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts on the egg stage', () => {
    render(<LoadingDino />);
    expect(screen.getByText('Calentando el huevo...')).toBeInTheDocument();
  });

  it('progresses through stages over time, ending on the hatched dino', () => {
    vi.useFakeTimers();
    render(<LoadingDino />);

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByText('Algo se mueve dentro...')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1500 * 5);
    });
    expect(screen.getByText('¡Ya casi está aquí!')).toBeInTheDocument();
  });
});
