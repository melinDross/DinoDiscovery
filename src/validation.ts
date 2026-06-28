import type { DinoAttributes } from '../shared/types';

export type NullablePartialAttributes = {
  [K in keyof DinoAttributes]: DinoAttributes[K] | null;
};

export function isSelectionComplete(
  partial: NullablePartialAttributes,
  discovererName: string
): partial is DinoAttributes {
  return (
    !!partial.size &&
    !!partial.habitat &&
    !!partial.diet &&
    !!partial.feature &&
    !!partial.personality &&
    discovererName.trim().length > 0
  );
}
