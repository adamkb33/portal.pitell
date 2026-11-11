import { describe, expect, it } from 'vitest';
import { BOOKING_THEME_KEYS, BOOKING_THEME_TOKENS, isBookingThemeKey } from './booking-theme';

describe('booking theme keys', () => {
  it('accepts allowlisted booking themes', () => {
    expect(isBookingThemeKey('pitell')).toBe(true);
    expect(isBookingThemeKey('ocean')).toBe(true);
    expect(isBookingThemeKey('sunset')).toBe(true);
    expect(isBookingThemeKey('forest')).toBe(true);
    expect(isBookingThemeKey('graphite')).toBe(true);
    expect(isBookingThemeKey('berry')).toBe(true);
    expect(isBookingThemeKey('sand')).toBe(true);
    expect(isBookingThemeKey('fredrikstad-barbershop')).toBe(true);
  });

  it('rejects missing or unsupported booking themes', () => {
    expect(isBookingThemeKey(null)).toBe(false);
    expect(isBookingThemeKey('neon')).toBe(false);
  });
});

describe('booking theme tokens', () => {
  it('sets every booking colour role, so a theme never falls back to another palette', () => {
    for (const key of BOOKING_THEME_KEYS) {
      const tokens = BOOKING_THEME_TOKENS[key] as Record<string, string>;
      for (const role of ['action', 'accent', 'highlight']) {
        expect(tokens[`--color-booking-${role}`], `${key} ${role}`).toBeTruthy();
      }
      expect(tokens['--color-booking-action-contrast'], `${key} contrast`).toBeTruthy();
      expect(tokens['--color-booking-highlight-contrast'], `${key} highlight contrast`).toBeTruthy();
      // Set per theme: a var() reference would resolve at :root to the default palette's colour.
      expect(tokens['--color-booking-action-text'], `${key} action text`).toBeTruthy();
    }
  });

  // WCAG 2.2 AA: 4.5:1 for text, 3:1 for control edges. Only literal hex values can be checked here.
  const hex = (value: string | undefined) => (value && /^#[0-9a-f]{6}$/i.test(value) ? value : null);
  const luminance = (color: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(color.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a: string, b: string) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  it.each(BOOKING_THEME_KEYS)('%s: text, action text and fills pass AA on their backgrounds', (key) => {
    const tokens = BOOKING_THEME_TOKENS[key] as Record<string, string>;
    const page = hex(tokens['--color-booking-surface-raised']) ?? hex(tokens['--color-background']) ?? '#ffffff';
    const checks: Array<[string, string | null, string | null, number]> = [
      ['text', hex(tokens['--color-booking-text']), page, 4.5],
      ['muted text', hex(tokens['--color-booking-text-muted']), page, 4.5],
      ['action as text', hex(tokens['--color-booking-action-text']), page, 4.5],
      ['text on action', hex(tokens['--color-booking-action-contrast']), hex(tokens['--color-booking-action']), 4.5],
      [
        'text on highlight',
        hex(tokens['--color-booking-highlight-contrast']),
        hex(tokens['--color-booking-highlight']),
        4.5,
      ],
      ['strong border', hex(tokens['--color-booking-border-strong']), page, 3],
    ];
    for (const [name, foreground, background, minimum] of checks) {
      if (foreground && background) {
        expect(contrast(foreground, background), `${key} ${name}`).toBeGreaterThanOrEqual(minimum);
      }
    }
  });

  it('keeps muted text visibly lighter than body text in Fredrikstad Barbershop', () => {
    const tokens = BOOKING_THEME_TOKENS['fredrikstad-barbershop'] as Record<string, string>;
    expect(contrast(tokens['--color-booking-text'], tokens['--color-booking-text-muted'])).toBeGreaterThan(1.8);
  });
});
