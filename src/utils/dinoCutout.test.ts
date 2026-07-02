import { describe, it, expect, vi } from 'vitest';
import { applyChromaKey, cutoutDinoImage } from './dinoCutout';

describe('applyChromaKey', () => {
  it('makes a pixel matching the exact background color fully transparent', () => {
    const data = new Uint8ClampedArray([13, 26, 15, 255]);
    applyChromaKey(data);
    expect(data[3]).toBe(0);
  });

  it('leaves a pixel far from the background color fully opaque', () => {
    const data = new Uint8ClampedArray([255, 0, 0, 255]);
    applyChromaKey(data);
    expect(data[3]).toBe(255);
  });

  it('partially fades a pixel in the feather zone between the two thresholds', () => {
    // Distance from (13,26,15) of ~60 falls between FULLY_TRANSPARENT_THRESHOLD (40)
    // and FEATHER_THRESHOLD (80), so it should be dimmed but not fully hidden or opaque.
    const data = new Uint8ClampedArray([13 + 60, 26, 15, 255]);
    applyChromaKey(data);
    expect(data[3]).toBeGreaterThan(0);
    expect(data[3]).toBeLessThan(255);
  });

  it('processes multiple pixels independently', () => {
    const data = new Uint8ClampedArray([
      13, 26, 15, 255, // background — should go transparent
      255, 255, 255, 255, // far from background — stays opaque
    ]);
    applyChromaKey(data);
    expect(data[3]).toBe(0);
    expect(data[7]).toBe(255);
  });
});

describe('cutoutDinoImage', () => {
  it('falls back to the original URL when the canvas has no 2D context', async () => {
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(null);
    const imageSpy = vi.spyOn(window, 'Image').mockImplementation(function (this: HTMLImageElement) {
      queueMicrotask(() => this.onload?.(new Event('load')));
      return this;
    } as unknown as typeof Image);

    const result = await cutoutDinoImage('/images/abc.png');
    expect(result).toBe('/images/abc.png');

    getContextSpy.mockRestore();
    imageSpy.mockRestore();
  });
});
