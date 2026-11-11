/**
 * Category colors (Fargenivå B): give each group, person or section its own soft color so different things look
 * different. Pick a tone by something stable (the group's position, an id), never at random, so the same thing keeps
 * its color on every page. Full class names so Tailwind can see them.
 */
export type CategoryTone = {
  /** Small dot or other strong mark on white. */
  dot: string;
  /** Soft background for a header strip, tile or initials circle. */
  tint: string;
  /** Text or icon on the tint. */
  ink: string;
};

export const CATEGORY_TONES: readonly CategoryTone[] = [
  { dot: 'bg-category-teal', tint: 'bg-category-teal-tint', ink: 'text-category-teal-ink' },
  { dot: 'bg-category-purple', tint: 'bg-category-purple-tint', ink: 'text-category-purple-ink' },
  { dot: 'bg-category-pink', tint: 'bg-category-pink-tint', ink: 'text-category-pink-ink' },
  { dot: 'bg-category-orange', tint: 'bg-category-orange-tint', ink: 'text-category-orange-ink' },
  { dot: 'bg-category-sky', tint: 'bg-category-sky-tint', ink: 'text-category-sky-ink' },
  { dot: 'bg-category-plum', tint: 'bg-category-plum-tint', ink: 'text-category-plum-ink' },
];

/** The tone for the item at this stable position (wraps around after the last tone). */
export function categoryTone(position: number): CategoryTone {
  const index = ((Math.trunc(position) % CATEGORY_TONES.length) + CATEGORY_TONES.length) % CATEGORY_TONES.length;
  return CATEGORY_TONES[index];
}
