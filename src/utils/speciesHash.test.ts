import { describe, it, expect } from 'vitest';
import { generateSpeciesId, calculateRarity } from './speciesHash';

describe('generateSpeciesId', () => {
  it('is deterministic for the same attributes regardless of key order', () => {
    const a = generateSpeciesId({ size: 'Gigante', habitat: 'Volcán' });
    const b = generateSpeciesId({ habitat: 'Volcán', size: 'Gigante' });
    expect(a).toBe(b);
  });

  it('matches the DX-XXX-XXX format', () => {
    const id = generateSpeciesId({ size: 'Pequeño', diet: 'Herbívoro' });
    expect(id).toMatch(/^DX-[0-9A-Z]{3}-[0-9A-Z]{3}$/);
  });

  it('produces different ids for different attributes', () => {
    const a = generateSpeciesId({ size: 'Gigante' });
    const b = generateSpeciesId({ size: 'Pequeño' });
    expect(a).not.toBe(b);
  });
});

describe('calculateRarity', () => {
  it('returns common for the lowest-point combination', () => {
    expect(
      calculateRarity({
        size: 'Mediano',
        diet: 'Herbívoro',
        feature: 'Escamas coloridas',
        personality: 'Amigable',
        habitat: 'Selva',
      })
    ).toBe('common');
  });

  it('returns legendary for the highest-point combination', () => {
    expect(
      calculateRarity({
        size: 'Coloso',
        diet: 'Oófago',
        feature: 'Alas',
        personality: 'Sigiloso',
        habitat: 'Ártico',
      })
    ).toBe('legendary');
  });

  it('applies the Coloso+Oófago+Alas multiplier', () => {
    const withoutMultiplier = calculateRarity({
      size: 'Coloso',
      diet: 'Carnívoro',
      feature: 'Alas',
      personality: 'Amigable',
      habitat: 'Selva',
    });
    const withMultiplier = calculateRarity({
      size: 'Coloso',
      diet: 'Oófago',
      feature: 'Alas',
      personality: 'Amigable',
      habitat: 'Selva',
    });
    expect(withMultiplier).toBe('legendary');
    expect(withoutMultiplier).not.toBe('legendary');
  });

  it("treats Gigante as the doc's Gigantesco tier (3 points)", () => {
    // Gigante(3) + Oófago(4) + Alas(4) + Sigiloso(3) + Ártico(3) = 17 points,
    // no special multiplier applies (multipliers require size 'Coloso' or 'Diminuto').
    // 17 falls in the 15-17 range, which is 'epic', not 'legendary'.
    const giganteHigh = calculateRarity({
      size: 'Gigante',
      diet: 'Oófago',
      feature: 'Alas',
      personality: 'Sigiloso',
      habitat: 'Ártico',
    });
    expect(giganteHigh).toBe('epic');
  });
});
