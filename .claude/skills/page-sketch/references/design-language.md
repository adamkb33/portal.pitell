# Design language

The look of portal.pitell, taken from the reference designs (appointment list, public booking flow). Values are the real tokens in `app/styles/tokens.css` and `app/styles/booking-tokens.css`; use the token names in code and the hex values in sketches.

## Two themes

|                           | Company side (staff)                                                             | Public booking (customers)                                                            |
| ------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Action / selected / "now" | `interactive` #2455d6, hover #1c43b0, tint `blue-50` #e1eafe or `interactive/10` | `booking-action` indigo #4338ca, tint `booking-action-muted`                          |
| Accents                   | category colors (below)                                                          | `booking-accent` violet #6d4fd6, `booking-highlight` magenta #be185d (~10% of the UI) |
| Final confirm             | —                                                                                | `booking-confirm` green #047857                                                       |
| Tokens to use             | `background`, `surface`, `border`, `text-*`, `interactive`                       | only `booking-*` (salons can re-theme them; never use `interactive`/`blue-*` there)   |

Salon themes (`app/lib/booking-theme.ts`, `booking-themes/*`): every theme must pass WCAG AA, and `app/lib/booking-theme.test.ts` checks it (text and muted text 4.5:1, action as text 4.5:1, text on action and highlight fills 4.5:1, strong borders 3:1). Rules that keep a light brand colour (like Fredrikstad Barbershop's gold) usable:

- The brand colour as text, links or a focus ring is `booking-action-text`, never `booking-action` (a light gold is only a fill, with dark `booking-action-contrast` text on it).
- Muted text is a real muted grey (≈7:1), clearly lighter than body text; a second dark brand colour as "muted" text gives no hierarchy.
- Tints are solid colours, not see-through, so they look the same on any surface; warm or cool, one family per theme.
- Every theme sets every booking token itself (a `var()` reference resolves at `:root` to the default indigo).

Shared neutrals: page `surface` #e8edf5, cards `background` #ffffff, border #c8d2e2, text #162238, muted text #475569, light text #94a3b8, strip `slate-100` #f1f5f9, sidebar #13213a.

Status, both themes: success soft #f0fdf4 / text #14532d; danger soft #fef2f2 / text #b42318 (`danger-text`); warning soft #fffbeb / text #78350f.

Form fields: border `field-border` #8592a6 and placeholder `text-placeholder` #64748b (darker than card borders so fields meet WCAG contrast); use them in sketches too.

## Color means something

- **Blue (indigo in booking)** = the thing to press or the thing happening now: primary button, selected item, active filter, the "Nå" row (solid) and the "Neste" row (tint + 4px left bar). The one fixed exception is the company app's top bar: solid blue on phones, a 3px blue line on the white desktop header (`app/routes/root.layout.tsx`). It's always in the same place, so it reads as the app's color, not an action.
- **Green / red / amber** = status only (done/free/confirm, problem/no-show/delete, warning). Never decoration.
- **Category colors** = which group, person or section something belongs to (Fargenivå B, below).
- Grey/muted = past, disabled, secondary.
- Color never works alone: there is always a name, label or icon too.

## Color by category (Fargenivå B, "Tonet")

The user wants enough color to tell different things apart and make pages feel alive, at a soft-tint level.

Palette, in assignment order (avoid blue, green, red, amber — they already mean something):

| Name   | Strong (dot, icon on white) | Ink (text/icon on tint) | Tint (background)    |
| ------ | --------------------------- | ----------------------- | -------------------- |
| teal   | #14b8a6                     | #0f766e                 | teal 14–20% on white |
| purple | #8b5cf6                     | #6d28d9                 | purple 14–20%        |
| pink   | #ec4899                     | #be185d                 | pink 14–20%          |
| orange | #f97316                     | #c2410c                 | orange 14–20%        |
| sky    | #0ea5e9                     | #0369a1                 | sky 14–20%           |
| plum   | #702963 (`tertiary`)        | #702963                 | plum 12–16%          |

In code, use `categoryTone(position)` from `~/ui` (`app/ui/lib/category-tones.ts`). It returns the `dot`, `tint` and `ink` classes backed by the `--color-category-*` tokens in `tokens.css` (tint = 14% on white). Don't use the older `*-soft` tokens (`teal-soft` etc.); they are too pale. In sketches the tint is `color-mix(in oklab, <strong> 14%, white)`, or 20% for initials circles. If initials circles need a stronger tint in code, add a `-tint-strong` token rather than hardcoding it. Danger text on the company side is `text-danger-text`.

Where it goes:

- **Groups/categories** (service groups, channels like email vs SMS, schedule types): tinted header strip with a strong-color dot, group name in normal ink. Marketing already has `marketing-email` (blue) and `marketing-sms` (plum).
- **People** (customers, employees): initials circle with tint background and ink letters.
- **App sections** (sidebar, overview tiles): icon in a rounded tile with tint background and ink icon.
- **Status chips**: soft status colors as today.

Rows themselves stay white; the color sits in headers, dots, circles and tiles. Assign colors by something stable (group order or id, person id, fixed per section) so "Menn" or "Emma Vik" is the same color on every page. In the booking flow, group colors come from the booking theme instead (`booking-action-muted`, `booking-accent-muted`, `booking-highlight-muted` with matching dots; see `GROUP_TONES` in the select-services route).

## Type

- Inter for everything; Inter Tight (`font-display`) for big page/detail titles.
- Row title / name: 16px semibold (600). Secondary line: 14px regular, muted. Meta, chips, group strips: 12px semibold.
- Booking step titles: `heading-lg` (30px semibold) as a question ("Hva vil du bestille?", "Når passer det?"), with the company name as a small label above.
- Detail page title: 24px bold, tight tracking.
- Times, prices and counts: `tabular-nums`, semibold.
- No uppercase micro labels (old style, being removed).

## Space and shape

- 4px grid. Common steps: 8, 12, 16, 20, 24, 32.
- Row padding 16px sides (20px from `sm`), list rows 60px high, toolbar padding 16–20px.
- Gap between page blocks 16px, on every page including the booking steps (title to content too). Inside a card 12–16px. Between groups of the same kind (service groups, cards in a list) 12px.
- **Compact by default: space only where it groups or separates something.** Space is how people see what belongs together (proximity): small inside a group, larger between groups, never larger inside than between. Space that groups nothing is removed, not kept "for air".
  - One side gutter per page: the app shell's `<main>` pads the sides (12px phone, 16px `sm`, 32px `lg`), so pages and templates inside it use `Container gutter="none"` and never add their own side padding on top.
  - No decorative top/bottom margins on titles, no empty space under the last card (except the room a floating bar needs), no padding on wrappers that only wrap.
  - Largest gaps on the page: 16px phone, 24px desktop. 32px+ only between unrelated sections on wide desktop layouts, if at all.
  - Compact never shrinks touch targets (44px on phones) or text sizes; it removes empty space, not readability.
- Radius: controls 8px (`radius-control`), list cards and booking panels 16px (`rounded-xl` / `radius-booking-panel`), chips and pills full.
- Borders 1px `border`; dividers between rows, not gaps between separate cards ("dense lists: bordered rows, not rounded cards").
- Shadows: none on lists and cards; only floating things (bottom bar, popovers) get `shadow-lg`.
- Touch: 44px (`h-11`) on phones, 40px (`h-10`) or 36px (`h-9`) from `sm`.

## Copy (Norwegian, minimal)

- Titles and labels only. No descriptions or helper paragraphs unless they carry real information.
- Buttons are short verbs: "Ny time", "Lagre", "Slett time", "Tilbake", "Fortsett", "Velg tid", "Endre", "Bruk periode", "Nullstill".
- Prices and durations are estimates: "ca. 450 kr", "ca. 20 min". Totals: "Estimert total".
- Dates: "lørdag 7. nov.", day groups "I dag · lørdag 7. nov.", "I morgen · …". Counts: "2 avtaler", "1 tjeneste".
- Empty states: one title ("Ingen kommende avtaler"), at most one line, at most one action.
- Disabled buttons say why in the message strip above them ("Velg minst én tjeneste"), and look neutral grey with readable text, never faded brand color.

## Avoid (older style still found in some routes)

- Uppercase overline labels and tiny table headers.
- Tables with Rediger/Slett on every row.
- Number tiles in four different colors; decorative blurred circles, gradient bars, glow.
- Card inside card with the same surface; three or more nesting levels.
- Several filled buttons on one screen, or blue used for decoration.
- Hardcoded hex in JSX (e.g. `#b42318`; use `text-danger-text`): use or add a token.
