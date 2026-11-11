# Booking Design Spec (Phase 1)

## Goal

Reduce design variance across the public booking flow by enforcing one visual system and one token language.

## Scope

Phase 1 is foundation only:

- Define the shared visual rules
- Introduce booking token aliases
- Start applying aliases in core booking routes

## Visual Rules

1. Use booking semantic tokens for color decisions in booking routes:

- `booking-background`
- `booking-surface`
- `booking-surface-muted`
- `booking-border`
- `booking-text`
- `booking-text-muted`
- `booking-action`
- `booking-action-hover`
- `booking-action-contrast`

   Palette (booking only, defined in `app/styles/booking-tokens.css`):

   - Neutrals ~60%: page `booking-surface`, cards `booking-surface-raised`, ink `booking-text`.
   - Indigo `booking-action` ~30%: primary buttons, selection, links.
   - Violet `booking-accent`: secondary elements such as the loyalty stub.
   - Magenta `booking-highlight` ~10%: rewards and "next up" highlights only.
   - Status colours stay fixed and keep their meaning: green confirm, red danger. Never use them as decoration.
   - Do not use `interactive`/`blue-*`/`teal-*` classes in booking routes; use the `booking-*` tokens.

2. Prefer shared UI primitives for layout and hierarchy:

- `PageHeader`
- `Panel`
- `Card`
- `StickyFooterPageTemplate`
- `StickySummaryBar`

3. Use one interaction language:

- Selected state: stronger border + action background
- Default state: neutral surface + subtle hover
- Disabled state: opacity + no hover motion

4. Keep consistent spacing scale:

- Section spacing via `Stack`
- Internal card spacing via `CardHeader` / `CardContent` / `CardFooter`

## Phase 1 Implementation Checklist

- [x] Add booking alias token layer (`app/styles/booking-tokens.css`)
- [x] Wire booking alias layer into global CSS (`app/app.css`)
- [x] Define Phase 1 spec (this document)
- [ ] Replace remaining non-semantic/legacy color classes in booking routes

## Phase 1 Non-Goals

- No redesign of booking UX flow
- No component API redesign
- No copy/content changes
