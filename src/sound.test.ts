import { describe, it, expect, vi, beforeEach } from 'vitest';
import { playClickSound } from './sound';

describe('playClickSound', () => {
  let oscillator: { type: string; frequency: { value: number }; connect: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> };
  let gain: { gain: { setValueAtTime: ReturnType<typeof vi.fn>; exponentialRampToValueAtTime: ReturnType<typeof vi.fn> }; connect: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    oscillator = {
      type: '',
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    gain = {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    };

    const FakeAudioContext = vi.fn().mockImplementation(function FakeAudioContext() {
      return {
        currentTime: 0,
        createOscillator: vi.fn(() => oscillator),
        createGain: vi.fn(() => gain),
        destination: {},
      };
    });
    vi.stubGlobal('AudioContext', FakeAudioContext);
  });

  it('plays a short synthesized beep through the Web Audio API', () => {
    playClickSound();

    expect(oscillator.connect).toHaveBeenCalledWith(gain);
    expect(gain.connect).toHaveBeenCalled();
    expect(oscillator.start).toHaveBeenCalled();
    expect(oscillator.stop).toHaveBeenCalled();
  });

  it('does nothing when the Web Audio API is unavailable', () => {
    vi.stubGlobal('AudioContext', undefined);
    expect(() => playClickSound()).not.toThrow();
  });
});
