import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom has no real canvas 2d context, so the real library would throw
// when it tries to animate; every test gets a harmless no-op instead.
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
