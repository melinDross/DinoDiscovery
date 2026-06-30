import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom has no real canvas 2d context, so the real library would throw
// when it tries to animate; every test gets a harmless no-op instead.
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

// jsdom doesn't implement ResizeObserver; components that measure their own
// size (e.g. CardScene's fit-to-container scaling) get a harmless no-op so
// they render at their default state instead of crashing.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
