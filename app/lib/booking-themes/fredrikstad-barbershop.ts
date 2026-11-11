import type { CSSProperties } from 'react';

/**
 * Fredrikstad Barbershop: gold on warm white, with the brand navy as the highlight.
 * Contrast (WCAG 2.2, checked 2026-11-11): body text 16:1, muted text #5c544b 7.4:1, gold used as text or focus ring
 * is `action-text` #8c6338 (5.3:1; the light gold #d19f68 is 2.4:1 and only ever a fill, with dark text on it, 8:1),
 * strong borders #a87b45 3.8:1, white on navy 14:1. Tints are solid (not see-through) so they look the same on any
 * surface. `text-inverse` stays dark (#101010, 8:1): here it is the text on the gold `interactive` fill. Red and green
 * buttons take their white text from their own booking tokens, so they are not affected.
 */
export const fredrikstadBarbershopTheme = {
  '--color-background': '#ffffff',
  '--color-surface': '#faf8f5',
  '--color-surface-raised': '#ffffff',
  '--color-border': '#e6ded5',
  '--color-border-strong': '#a87b45',

  '--color-text-primary': '#212025',
  '--color-text-secondary': '#5c544b',
  '--color-text-disabled': '#8b8278',
  '--color-text-inverse': '#101010',

  '--color-primary': '#d19f68',
  '--color-primary-hover': '#af804d',
  '--color-primary-active': '#8c6338',
  '--color-primary-contrast': '#101010',

  '--color-interactive': '#d19f68',
  '--color-interactive-hover': '#af804d',
  '--color-interactive-active': '#8c6338',

  '--color-secondary': '#b8892f',

  // Route-level booking background
  '--color-booking-background': '#ffffff',

  // Main booking cards/panels
  '--color-booking-surface': '#ffffff',

  // Grouped/quiet sections
  '--color-booking-surface-muted': '#faf8f5',

  // Inputs/cards that need to sit above normal panels
  '--color-booking-surface-raised': '#ffffff',

  // Soft rows and low-emphasis cards
  '--color-booking-surface-subtle': '#f3f0ec',

  // Selected non-primary surfaces
  '--color-booking-surface-strong': '#fff4e8',

  '--color-booking-border': '#e6ded5',
  '--color-booking-border-strong': '#a87b45',

  '--color-booking-text': '#212025',
  '--color-booking-text-muted': '#5c544b',
  '--color-booking-text-inverse': '#101010',

  '--color-booking-action': '#d19f68',
  '--color-booking-action-hover': '#af804d',
  '--color-booking-action-muted': '#f9f2ea',
  '--color-booking-action-ring': 'rgb(209 159 104 / 0.42)',
  '--color-booking-action-contrast': '#101010',
  '--color-booking-action-text': '#8c6338',

  '--color-booking-accent': '#b8892f',
  '--color-booking-accent-muted': '#f5eee2',

  // Highlight (rewards, "next up"): the brand navy, so it reads against the gold action colour.
  '--color-booking-highlight': '#10285d',
  '--color-booking-highlight-muted': '#e8eaf0',
  '--color-booking-highlight-contrast': '#ffffff',
} as CSSProperties;
