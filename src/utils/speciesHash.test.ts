import { describe, it, expect } from 'vitest';
import { generateSpeciesId, calculateRarity, calculateRarityScore, RARITY_TIER_NUMBERS } from './speciesHash';

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

describe('calculateRarityScore', () => {
  it('returns the same numeric total calculateRarity uses internally', () => {
    const attrs = {
      size: 'Mediano',
      diet: 'Herbívoro',
      feature: 'Escamas coloridas',
      personality: 'Amigable',
      habitat: 'Selva',
    };
    expect(calculateRarityScore(attrs)).toBe(5);
    expect(calculateRarity(attrs)).toBe('common');
  });

  it('applies special multipliers to the score, not just the tier', () => {
    // Coloso(4) + Carnívoro(2) + Alas(4) + Amigable(1) + Selva(1) = 12, no multiplier
    // (the Coloso+Oófago+Alas rule needs diet 'Oófago', not 'Carnívoro').
    const withoutMultiplier = calculateRarityScore({
      size: 'Coloso',
      diet: 'Carnívoro',
      feature: 'Alas',
      personality: 'Amigable',
      habitat: 'Selva',
    });
    // Coloso(4) + Oófago(4) + Alas(4) + Amigable(1) + Selva(1) = 14, x1.5 = 21.
    const withMultiplier = calculateRarityScore({
      size: 'Coloso',
      diet: 'Oófago',
      feature: 'Alas',
      personality: 'Amigable',
      habitat: 'Selva',
    });
    expect(withoutMultiplier).toBe(12);
    expect(withMultiplier).toBe(21);
  });

  it('matches the Gigante/Volcán/Carnívoro/Cuernos/Feroz fixture used elsewhere (score 12, rare)', () => {
    const attrs = {
      size: 'Gigante',
      diet: 'Carnívoro',
      feature: 'Cuernos',
      personality: 'Feroz',
      habitat: 'Volcán',
    };
    expect(calculateRarityScore(attrs)).toBe(12);
    expect(calculateRarity(attrs)).toBe('rare');
  });
});

describe('RARITY_TIER_NUMBERS', () => {
  it('maps every rarity tier to a number from 1 to 5, increasing with rarity', () => {
    expect(RARITY_TIER_NUMBERS.common).toBe(1);
    expect(RARITY_TIER_NUMBERS.uncommon).toBe(2);
    expect(RARITY_TIER_NUMBERS.rare).toBe(3);
    expect(RARITY_TIER_NUMBERS.epic).toBe(4);
    expect(RARITY_TIER_NUMBERS.legendary).toBe(5);
  });
});
