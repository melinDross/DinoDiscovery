import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LoadingDino, calculateProgress } from './LoadingDino';

describe('calculateProgress', () => {
  it('starts at 0', () => {
    expect(calculateProgress(0)).toBe(0);
  });

  it('approaches 90% asymptotically but never reaches it', () => {
    expect(calculateProgress(12000)).toBeCloseTo(56.88, 1);
    expect(calculateProgress(24000)).toBeCloseTo(77.85, 1);
    expect(calculateProgress(120000)).toBeLessThan(90);
  });
});

describe('LoadingDino', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts on the intact-egg phase', () => {
    render(<LoadingDino isDone={false} onTransitionEnd={() => {}} />);
    expect(screen.getByText('Incubando el huevo...')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/loading/egg-1-intact.png');
  });

  it('advances through phases 2-4 every 4 seconds', () => {
    vi.useFakeTimers();
    render(<LoadingDino isDone={false} onTransitionEnd={() => {}} />);

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByText('Algo se mueve dentro...')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/loading/egg-2-wobble.png');

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByText('¡Está agrietándose!')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByText('Está rompiendo el cascarón...')).toBeInTheDocument();
  });

  it('holds on the claws phase past 16s without isDone, then shows reassurance messages', () => {
    vi.useFakeTimers();
    render(<LoadingDino isDone={false} onTransitionEnd={() => {}} />);

    act(() => {
      vi.advanceTimersByTime(16000);
    });
    expect(screen.getByRole('img')).toHaveAttribute('src', '/loading/egg-5-claws.png');
    expect(
      screen.getByText('Tu dinosaurio es un poco tímido, está tardando un poco más...')
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(
      screen.getByText('¡Los mejores descubrimientos llevan su tiempo! Ya casi está...')
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(screen.getByRole('img')).toHaveAttribute('src', '/loading/egg-5-claws.png');
  });

  it('shows the burst phase immediately when isDone becomes true, then calls onTransitionEnd', () => {
    vi.useFakeTimers();
    const onTransitionEnd = vi.fn();
    const { rerender } = render(<LoadingDino isDone={false} onTransitionEnd={onTransitionEnd} />);

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    rerender(<LoadingDino isDone={true} onTransitionEnd={onTransitionEnd} />);

    expect(screen.getByText('¡Ha nacido tu dinosaurio!')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/loading/egg-6-burst.png');
    expect(onTransitionEnd).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(onTransitionEnd).toHaveBeenCalledTimes(1);
  });
});
