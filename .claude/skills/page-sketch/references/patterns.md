# Patterns

Anatomy of the building blocks, copied from the reference designs. Each has its source file so you can lift the exact classes when building.

Contents: page top · list card · list row · group header · toolbar and filters · empty state · pagination · detail page · edit/create page · booking step · selection rows · bottom bar · review/overview step · overview (hub) page.

How these behave (the create button above the bottom menu and the desktop "Ny …" button, form pages, delete, toasts) is set by the `ui-rules` skill; where this file and those rules differ, the rules win.

## Page top (company)

Source: `app/routes/company/booking/_components/booking-daily-switch.tsx`, `app/ui/templates/company-page-template.tsx`.

- The shell header shows the breadcrumb; `CompanyPageTemplate` keeps the `h1` for screen readers only.
- Up lives in the header, never in the page (`ui-rules` → Page top). Phone: a domain's top pages show ≡ (menu); every page below them shows ‹ in its place. Desktop: the breadcrumb's links. So no "‹ Tilbake" link or "Tilbake til …" button above any page content, forms included.
- First row: a segmented switch or filters on the left, one primary button on the right (`Button` with a `+` icon, e.g. "Ny time"). On phones the primary "new" action is the centre `+` of the bottom menu, so the button hides below `lg`.
- Segmented switch: white box, 1px border, 4px padding, active segment `bg-blue-50 text-interactive`, icon + label, 36px high.

## List card

Source: `app/routes/company/booking/appointments/company.booking.appointments.route.tsx`.

One white card holds the whole list: `rounded-xl border border-border bg-background overflow-hidden`, no shadow.

1. Toolbar (padding 16/20px, bottom border): segmented filter (e.g. Kommende / Tidligere), then search field + "Filtrer" button on one line.
2. Group headers and rows.
3. Footer (top border, 12px/16px padding, 14px muted): total ("67 avtaler") left, "Side 1 av 14" + outline icon buttons right. Hide the pager when there is one page.

## List row

Source: `app/routes/company/booking/appointments/_components/appointment.list-row.tsx`.

- The whole row is one `Link` to the item's page; chevron at the far right; no buttons inside the row.
- Fixed height 60px, `flex items-center gap-3 px-4 sm:px-5`, rows separated by `divide-y divide-border`.
- Columns: lead (time `w-14` tabular semibold, or an initials circle / category tile), main (title semibold truncate + one muted 14px line joined with " · "), trailing (value like price, tabular semibold; a chip above it when needed), chevron.
- Status never shares a line with the title, so the title always has room.
- State via background + 4px inset left bar (`shadow-[inset_4px_0_0_…]`): now = solid `interactive` with white text; next = `interactive/10` + blue bar; normal = white + border-colored bar; past = `surface-variant-1`; problem = red bar + red chip.
- Small extras (image count etc.) sit at the end of the secondary line as icon + number.

## Group header

- Appointment list (days): strip `bg-slate-100`, 12px semibold, `border-y`, label left, count right ("3 avtaler").
- Category groups (services, channels, types) with Fargenivå B: strip tinted with the group's category color, a strong-color dot before the name, count right in muted text. Built example: the Tjenester list (`app/routes/company/booking/admin/service-groups/services/company.booking.admin.service-groups.services.route.tsx`, grouping in `_utils/group-services.ts`). Booking flow version: `select-services` route, `GROUP_TONES`.
- Two related admin lists share one page top with a switch (`app/routes/company/booking/admin/_components/service-admin-switch.tsx`, Tjenester | Grupper).

## Toolbar and filters

Source: `app/routes/company/booking/appointments/_components/appointment.table-header-slot.tsx`.

- Search: input with leading search icon and a clear (×) button when filled, 44px on phones / 40px from `sm`, debounced 300ms, searches as you type.
- "Filtrer" button: same height and radius as search. Active filter = blue border, blue tint, blue text and a small round count badge.
- Desktop: popover under the button — presets on the left (rows with check when active), calendar on the right, footer "Nullstill" · chosen range · "Bruk periode".
- Phone: bottom sheet with a drag handle, title + "Nullstill", preset chips, calendar, full-width "Bruk periode" (disabled until a date is chosen, with a one-line reason under it).

## Empty state

Inside the list card: centred, 48px vertical padding, icon in a 56px circle (`bg-blue-50 text-interactive`), title 16px semibold, one muted line, one action at most (outline button for "clear filter", primary for "create first").

## Pagination

Footer of the list card (see above). Page size small (5 on appointments). Icon buttons `variant="outline" size="icon"` with `aria-label`.

## Detail page

Source: `app/routes/company/booking/appointments/_components/appointment-card.tsx`, detail route.

- One white card at the top (the way back is the header's ‹ / breadcrumb).
- Title: name 24px bold + status pill (`bg-interactive/10`, 12px semibold). Under it the key facts on their own lines (date semibold, time with clock icon muted).
- Notices (no-show, free visit) as soft status boxes with an icon, one sentence.
- Quick actions as tonal buttons side by side (`bg-interactive/10 text-interactive`, 44px), raw contact info as a muted 12px line under them.
- Line items in a bordered divided list (name semibold + muted meta left, price right) with a tinted "Estimert total" row when there is more than one.
- Media as a grid with a dashed "Last opp bilde" tile.
- Destructive and rare actions as text buttons at the bottom right after a top border ("Slett time" in red).

## Edit / create page

Not built yet as a shared pattern; follow this when sketching.

- Own route (`…/create`, `…/:id/edit`), the item name (or "Ny tjeneste") as the title, no back link in the page (the header's ‹ goes up).
- Fields in one white card, labels above fields (`FormField`: label, input, error or hint), short pairs side by side from `md` (`grid gap-4 md:grid-cols-2`), like the booking contact step.
- "Lagre" is the only primary button: floating bottom bar on phones (reuse the `BookingFooterNav` idea with company tokens), inline at the end of the form on desktop.
- Delete is a red text button at the bottom of the page on edit, never next to "Lagre".

## Dates and periods in forms

Source: `app/components/pickers/date-field.tsx`, Nytt fravær (`schedule-unavailability/create`).

- A date is a `DateField`: the day as text ("Torsdag 12.11.2026") with a calendar icon; it opens the standard calendar and one click picks the day and closes it. No day strips or other custom pickers.
- A period that can span days is one continuous period, like a calendar event: "Hele dagen" (`Switch`) first, then **Starter** and **Slutter** rows, each a date with its time on the same row. Never two dates on one row and two times on another (that reads as "these hours every day"). Slutter follows Starter, so one day is one click.
- The Lagre bar names the result in one line ("Torsdag 12. nov. 12:00 → søndag 15. nov. 18:00") or why it can't be saved.

## Booking step

Source: `app/ui/templates/booking-step-template.tsx`, routes under `app/routes/booking/public/appointment/session/`.

- `BookingStepTemplate label={companyName} title="<question>"`, no description.
- Content in panels: `rounded-[var(--radius-booking-panel)] border bg-booking-surface-raised`, divided rows inside.
- Only `booking-*` tokens.

## Selection rows

Source: `select-services/_components/service-row.tsx`, `select-time/_components/*`.

- Multi-select = checkbox square (20px, 2px border, filled indigo with a check when on); the whole row toggles. Selected row gets `bg-booking-action-muted`.
- Quantity stepper (− n +, 44px buttons, pill) appears under the row only once selected.
- Single choices like days and times: tiles, selected = filled indigo; unavailable = transparent and faded with an accessible "fullbooket" label. Days scroll horizontally in one strip with a calendar button for further dates.
- Shortcut card for the obvious choice ("Første ledige tid") with a dashed indigo border and a "Velg →" link.

## Bottom bar

Source: `app/routes/booking/public/_components/booking-footer-nav.tsx`.

- Phones: floating card 12px from the edges and bottom, `shadow-lg`, `max-w-md`; desktop: inline at the end of the content.
- Optional message strip above the buttons in a tint: the running summary ("1 valgt · ca. 20 min · ca. 450 kr") or why the button is disabled ("Velg minst én tjeneste").
- Buttons in equal columns: "Tilbake" outline left (left out on the first step), primary right.

## Cancel page (public)

Source: `app/routes/booking/public/_components/cancel-appointment.tsx` (both the Mine bookinger link and the email link).

- The page is the question: "Avbestille timen?" as the title, then one card (date and time on top, then the salon and services, `AppointmentSummaryCard`) and "Dette kan ikke angres." under it.
- The booking bar holds "Behold timen" (outline, goes back) and "Avbestill timen" (red `danger`). No second confirm dialog.
- Started already: the bar's message strip says why, with one link instead ("Til timen"). Nothing to cancel: a calm centred page ("Timen er allerede avbestilt") with one button.
- Result: the flash toast "Timen er avbestilt" on the page you land on.

## Review / overview step

Source: `overview/booking.public.appointment.session.overview.route.tsx`.

- Hero card for the main fact (date and time), tinted, large bold date, muted time + duration, outline "Endre dato og tid".
- Below, one card of edit rows: icon tile + small muted label + value, "Endre ›" pill on the right; the whole row is the link.
- Line items with prices; "Estimert total" only when there is more than one.
- Consent checkboxes in their own cards; final green confirm button in the bottom bar with the reason strip while terms are unticked.

## Overview (hub) page

Decided 2026-11-07 for every domain (first used on the Booking page, the blueprint):

- Cards of rows, each row an area: category-colored icon tile (the area's fixed color), name, one muted line ("Bookbar tid og fravær", "4 tjenester · 3 grupper"), chevron. Admin-only areas in their own card with a strip header ("Oppsett", "Admin" on the right).
- **Key destinations (2026-11-10):** a domain's one or two most-used areas (Booking: Kalender, Timebestillinger) come first as full-colour cards side by side, above the rows: a gradient in the area's colour, a white icon tile, the name in Inter Tight and **one live number** with a short label ("4 avtaler i dag", "16 kommende"), a faint circle and a large faded icon as background. Built: `KeyDestinationCard` (`app/routes/company/booking/_components/key-destination-card.tsx`); kit class `key`. Nothing more than that one number: no lists, no next-appointment preview, no extra number tiles.
- Every other area stays a row; no other quick look at another page's data.
- Each domain's areas and colors: `ui-rules` → `references/<domain>-domain.md`.

## Area switch

Two pages that belong together (Kalender | Timebestillinger, Bookbar tid | Fravær, Tjenester | Grupper) share one segmented control as the first thing on the page: white box, 1px border, 4px padding, two equal segments with icon + label, active segment `bg-blue-50 text-interactive`. Sources: `BookingDailySwitch`, `ServiceAdminSwitch` (to be merged into one `AreaSwitch`).

## Summary page (Oversikt of one thing)

For a thing the user owns one of, like Bookingprofil:

- First card: who/what it is (photo or initials circle in its color, name, one-line description).
- Second card: rows for each part (Profil, Tjenester, Arbeidstider), muted one-line summary, a small "Endre" pill on the right; the row opens the edit page.
- Optional last card with one row for a secondary action ("Se profilen som kunde").

## Numbers page (Tall)

Source: `app/routes/company/booking/statistics/` (`_components/statistics-parts.tsx`).

- A month stepper at the top: ‹ November 2026 ›, full width on phones. The month lives in the URL (`?maned=2026-10`); › is off on the current month.
- One card of stat rows: muted label, big number (22px bold, tabular), one muted comparison on the right ("33 % lavere enn oktober"). Two per row on desktop. Sentence case labels. Numbers that only make sense for the running month (Prognose) show only there.
- Then a card of rows that open detail pages, each with one line of real data ("Travlest mandag kl. 10"). Detail pages have the same stepper and keep the month; their header ‹ returns to that month.
- No colored KPI tiles, no icons in front of numbers.
- A count per day is a month calendar, not a bar chart (`_components/day-calendar.tsx`): Monday-first weeks, the date and the number in every day, shaded in four fixed steps of the area color (not relative to the busiest day), "–" for days with nothing, today outlined, days still ahead dashed and labelled "Booket". A table underneath for screen readers, so no chart library is needed.
