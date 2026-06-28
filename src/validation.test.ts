// src/validation.test.ts
import { describe, it, expect } from 'vitest';
import { isSelectionComplete } from './validation';
import type { DinoAttributes } from '../shared/types';

const fullAttrs: DinoAttributes = {
  size: 'Gigante',
  habitat: 'Volcán',
  diet: 'Carnívoro',
  feature: 'Cuernos',
  personality: 'Feroz',
};

describe('isSelectionComplete', () => {
  it('returns true when all attributes and a non-empty name are present', () => {
    expect(isSelectionComplete(fullAttrs, 'Lucía')).toBe(true);
  });

  it('returns false when an attribute is missing', () => {
    expect(isSelectionComplete({ ...fullAttrs, size: null }, 'Lucía')).toBe(false);
  });

  it('returns false when the discoverer name is empty or whitespace', () => {
    expect(isSelectionComplete(fullAttrs, '   ')).toBe(false);
    expect(isSelectionComplete(fullAttrs, '')).toBe(false);
  });
});
