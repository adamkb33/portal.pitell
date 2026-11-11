import type { CSSProperties } from 'react';

import { fredrikstadBarbershopTheme } from './booking-themes/fredrikstad-barbershop';

export const BOOKING_THEME_KEYS = [
  'pitell',
  'ocean',
  'sunset',
  'forest',
  'graphite',
  'berry',
  'sand',
  'fredrikstad-barbershop',
] as const;
export type BookingThemeKey = (typeof BOOKING_THEME_KEYS)[number];

export const BOOKING_THEME_LABELS: Record<BookingThemeKey, string> = {
  pitell: 'Pitell',
  ocean: 'Ocean',
  sunset: 'Sunset',
  forest: 'Forest',
  graphite: 'Graphite',
  berry: 'Berry',
  sand: 'Sand',
  'fredrikstad-barbershop': 'Fredrikstad Barbershop',
};

type Palette = {
  /** Primary action: buttons, selection, links. White text on it must pass AA. */
  action: string;
  actionHover: string;
  /** Secondary: supporting elements such as the loyalty stub. */
  accent: string;
  /** Highlight: rewards and "next up" only, roughly 10% of the UI. */
  highlight: string;
};

type Surfaces = { background: string; surface: string; border: string; text: string; textMuted: string };

// CSS variables that reference other variables are resolved where they are declared (:root), so a theme
// has to set every booking token itself; overriding only --color-interactive would not reach booking-action.
function bookingPalette({ action, actionHover, accent, highlight }: Palette): CSSProperties {
  return {
    '--color-interactive': action,
    '--color-interactive-hover': actionHover,
    '--color-secondary': accent,
    '--color-booking-action': action,
    '--color-booking-action-hover': actionHover,
    '--color-booking-action-muted': `color-mix(in oklab, ${action} 10%, var(--color-surface))`,
    '--color-booking-action-ring': `color-mix(in oklab, ${action} 35%, transparent)`,
    '--color-booking-action-contrast': '#ffffff',
    // The action colour as text and focus ring. Set here too: a var() reference would resolve at :root to the
    // default indigo. These palettes' action colours all pass AA on white; a light brand colour sets its own.
    '--color-booking-action-text': action,
    '--color-booking-accent': accent,
    '--color-booking-accent-muted': `color-mix(in oklab, ${accent} 12%, var(--color-surface))`,
    '--color-booking-highlight': highlight,
    '--color-booking-highlight-muted': `color-mix(in oklab, ${highlight} 10%, var(--color-surface))`,
    '--color-booking-highlight-contrast': '#ffffff',
    '--color-booking-border-strong': `color-mix(in oklab, var(--color-border) 72%, ${action})`,
  } as CSSProperties;
}

function bookingSurfaces({ background, surface, border, text, textMuted }: Surfaces): CSSProperties {
  return {
    '--color-background': background,
    '--color-surface': surface,
    '--color-border': border,
    '--color-text-primary': text,
    '--color-text-secondary': textMuted,
    '--color-booking-background': background,
    '--color-booking-surface': surface,
    '--color-booking-surface-muted': surface,
    '--color-booking-surface-raised': background,
    '--color-booking-surface-subtle': `color-mix(in oklab, ${surface} 86%, ${background})`,
    '--color-booking-surface-strong': `color-mix(in oklab, ${surface} 72%, ${background})`,
    '--color-booking-border': border,
    '--color-booking-text': text,
    '--color-booking-text-muted': textMuted,
  } as CSSProperties;
}

export const BOOKING_THEME_TOKENS: Record<BookingThemeKey, CSSProperties> = {
  pitell: bookingPalette({ action: '#4338ca', actionHover: '#3730a3', accent: '#6d4fd6', highlight: '#be185d' }),
  ocean: {
    ...bookingPalette({ action: '#0b5cab', actionHover: '#094f93', accent: '#0f766e', highlight: '#b45309' }),
    ...bookingSurfaces({
      background: '#f3fbff',
      surface: '#e8f6ff',
      border: '#c7e8ff',
      text: '#0b2f4a',
      textMuted: '#2f5f84',
    }),
    '--radius-control': '10px',
    '--radius-field': '10px',
    '--radius-card': '18px',
    '--radius-panel': '24px',
    '--border-control': '1px',
    '--border-card': '1px',
    '--border-selected': '2px',
    '--shadow-card': '0 8px 28px rgb(11 92 171 / 0.08)',
    '--shadow-panel': '0 14px 44px rgb(11 92 171 / 0.12)',
  } as CSSProperties,
  sunset: {
    ...bookingPalette({ action: '#b53b1f', actionHover: '#9e331a', accent: '#b45309', highlight: '#9d174d' }),
    ...bookingSurfaces({
      background: '#fff6f2',
      surface: '#ffede4',
      border: '#ffd6c4',
      text: '#512318',
      textMuted: '#8b4d3e',
    }),
    '--radius-control': '9999px',
    '--radius-field': '18px',
    '--radius-card': '22px',
    '--radius-panel': '28px',
    '--border-control': '1px',
    '--border-card': '1px',
    '--border-selected': '3px',
    '--shadow-card': '0 10px 30px rgb(181 59 31 / 0.08)',
    '--shadow-panel': '0 18px 48px rgb(181 59 31 / 0.13)',
  } as CSSProperties,
  forest: {
    ...bookingPalette({ action: '#1f6b45', actionHover: '#19593a', accent: '#3f6212', highlight: '#b45309' }),
    ...bookingSurfaces({
      background: '#f2faf4',
      surface: '#e4f2e8',
      border: '#cbe2d1',
      text: '#163222',
      textMuted: '#3d6a53',
    }),
    '--radius-control': '6px',
    '--radius-field': '6px',
    '--radius-card': '8px',
    '--radius-panel': '12px',
    '--border-control': '1px',
    '--border-card': '2px',
    '--border-selected': '3px',
    '--shadow-card': 'none',
    '--shadow-panel': '0 8px 22px rgb(31 107 69 / 0.10)',
  } as CSSProperties,
  graphite: {
    ...bookingPalette({ action: '#1f2937', actionHover: '#111827', accent: '#475569', highlight: '#0f766e' }),
    ...bookingSurfaces({
      background: '#ffffff',
      surface: '#f4f4f5',
      border: '#d4d4d8',
      text: '#18181b',
      textMuted: '#52525b',
    }),
    '--radius-control': '6px',
    '--radius-field': '6px',
    '--radius-card': '10px',
    '--radius-panel': '14px',
    '--border-control': '1px',
    '--border-card': '1px',
    '--border-selected': '2px',
    '--shadow-card': '0 1px 2px rgb(24 24 27 / 0.06)',
    '--shadow-panel': '0 8px 24px rgb(24 24 27 / 0.08)',
  } as CSSProperties,
  berry: {
    ...bookingPalette({ action: '#a21caf', actionHover: '#86198f', accent: '#6d28d9', highlight: '#0f766e' }),
    ...bookingSurfaces({
      background: '#fffafe',
      surface: '#fdf4ff',
      border: '#f0d4f7',
      text: '#3b0764',
      textMuted: '#6b21a8',
    }),
    '--radius-control': '14px',
    '--radius-field': '14px',
    '--radius-card': '20px',
    '--radius-panel': '26px',
    '--border-control': '1px',
    '--border-card': '1px',
    '--border-selected': '2px',
    '--shadow-card': '0 8px 26px rgb(162 28 175 / 0.08)',
    '--shadow-panel': '0 16px 44px rgb(162 28 175 / 0.12)',
  } as CSSProperties,
  sand: {
    ...bookingPalette({ action: '#92400e', actionHover: '#78350f', accent: '#115e59', highlight: '#9f1239' }),
    ...bookingSurfaces({
      background: '#fffdf8',
      surface: '#faf3e6',
      border: '#eadfce',
      text: '#3b2a14',
      textMuted: '#7c5a2e',
    }),
    '--radius-control': '10px',
    '--radius-field': '10px',
    '--radius-card': '14px',
    '--radius-panel': '20px',
    '--border-control': '1px',
    '--border-card': '1px',
    '--border-selected': '2px',
    '--shadow-card': '0 6px 20px rgb(146 64 14 / 0.07)',
    '--shadow-panel': '0 12px 36px rgb(146 64 14 / 0.10)',
  } as CSSProperties,
  'fredrikstad-barbershop': fredrikstadBarbershopTheme,
};

export function isBookingThemeKey(value: string | null): value is BookingThemeKey {
  if (!value) return false;
  return (BOOKING_THEME_KEYS as readonly string[]).includes(value);
}
