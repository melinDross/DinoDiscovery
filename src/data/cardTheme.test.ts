import { describe, it, expect } from 'vitest';
import { pickHabitatBackground, HABITAT_BACKGROUND_VARIANTS } from './cardTheme';
import type { DinoAttributes } from '../../shared/types';

describe('pickHabitatBackground', () => {
  it('is deterministic for the same attributes', () => {
    const attrs: DinoAttributes = {
      size: 'Gigante',
      diet: 'Carnívoro',
      feature: 'Cuernos',
      personality: 'Feroz',
      habitat: 'Volcán',
    };
    expect(pickHabitatBackground(attrs)).toEqual(pickHabitatBackground({ ...attrs }));
  });

  it('always returns one of the two configured variants for that habitat', () => {
    const attrs: DinoAttributes = {
      size: 'Gigante',
      diet: 'Carnívoro',
      feature: 'Cuernos',
      personality: 'Feroz',
      habitat: 'Volcán',
    };
    const picked = pickHabitatBackground(attrs);
    expect(HABITAT_BACKGROUND_VARIANTS.Volcán).toContainEqual(picked);
  });

  it('can pick either variant depending on the attribute combination', () => {
    const variantA = pickHabitatBackground({
      size: 'Gigante',
      diet: 'Carnívoro',
      feature: 'Cuernos',
      personality: 'Feroz',
      habitat: 'Volcán',
    });
    const variantB = pickHabitatBackground({
      size: 'Coloso',
      diet: 'Oófago',
      feature: 'Alas',
      personality: 'Sigiloso',
      habitat: 'Volcán',
    });
    expect(variantA).not.toEqual(variantB);
  });
});
