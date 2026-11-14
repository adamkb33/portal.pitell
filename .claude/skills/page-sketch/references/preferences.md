# The user's design preferences

What the user has decided about how portal.pitell should look. Newest last. This file wins over everything else in the skill. When the user states a new general rule while reviewing a sketch, add a dated line in the right section (and remove any line it replaces).

## Decided

- 2026-11-01 – Keep designs simple: fewer buttons, one primary (blue) action per screen, no decorative extras, no duplicated controls.
- 2026-11-01 – Show a sketch (desktop + phone) and wait for "Build it" before changing code. Default to one recommended sketch, not a menu of options. The user often asks to trim further after seeing it.
- 2026-11-02 – Minimal customer-facing copy: no descriptions, subtitles or helper sentences unless they carry real information (an error, a price, a fully booked day).
- 2026-11-07 – The appointment list and the public booking flow are the reference designs. New pages should look like they belong with them.
- 2026-11-07 – Admin lists (Tjenester, Ansatte, Kontakter…) use appointment-style rows on desktop too: one card, whole row opens the item, chevron, no per-row Rediger/Slett buttons. Edit and delete live on the item's own page.
- 2026-11-07 – Create and edit forms open on their own page, not in a dialog or side panel.
- 2026-11-07 – Company pages start with a toolbar, not a big title (the breadcrumb names the page): switch/filters on the left, one primary button on the right.
- 2026-11-07 – Sketches are real-looking (app colors, Inter, Norwegian copy, real data), not grey wireframes.
- 2026-11-07 – More color to tell different things apart and make pages feel alive: "Fargenivå B (Tonet)". Groups/categories, people and app sections get a soft tint of their own category color; blue stays for actions and "now"; green/red/amber stay for status. Details in `design-language.md` → Color by category.

- 2026-11-07 – The phone create button creates what the current page lists (look changed 2026-11-10, see below); no create button on pages with nothing to create. Form pages on phones hide the bottom menu and show a floating Lagre bar. Every result message is the flash toast. Full rules: the `ui-rules` skill.
- 2026-11-07 – The user hates design variance between pages. The page system in the `ui-rules` skill (page types, areas with a switch and color, page top) is for the whole app. The code is rewritten domain by domain, booking first; booking is the blueprint the other domains copy. Per domain: survey every page, sketch the whole domain on the app-wide rules (phone frames, real data), get approval, write the domain map (`ui-rules` → `references/<domain>-domain.md`), then build.
- 2026-11-07 – Oversikt pages (any domain) are rows that lead to areas (colored tile, name, one muted line). Changed 2026-11-10: see key destinations below.
- 2026-11-07 – Numbers pages (Tall, any domain) show stats as rows in one neutral card, not colored KPI tiles.
- 2026-11-07 – Up is in the header: on phones every page below a domain's top pages shows ‹ (where ≡ sits on top pages), on desktop the breadcrumb. No back links in the page. Sketch the phone header that way.
- 2026-11-07 – Always sketch each page (phone + desktop) and wait for the user's approval before building it — even when the page was already part of an approved domain sketch. The domain sketch sets direction; every page still gets its own sketch and "Build it".
- 2026-11-09 – Appointments are "avtaler" in UI copy ("95 avtaler", "Snitt per avtale"), never "timer", which reads as hours.
- 2026-11-09 – Charts must make it obvious which day is which. Daily numbers for a month are shown as a calendar with the number in each day, not as bars along an axis.
- 2026-11-09 – Top bar: on phones (below `lg`) a plain primary-blue bar, page name in Inter Tight, white ≡/‹/bell, one faint circle top right and nothing more. Desktop keeps the white header with a thin blue line on top; the current page in the breadcrumb is Inter Tight. Keep decoration minimal: the user found a big blue band with bubbles too much, especially on desktop.
- 2026-11-09 – Sidebar and phone menu (one component): navy chrome with a quiet background (soft blue glow behind the company card, dot grid fading out by the middle, two thin rings in the bottom corner). The company card sits on top in primary blue; the account is at the bottom (desktop: name + ⋯ menu, so the header has no account menu). Section icons sit in tiles of their category color (Booking teal, Tilbud orange, Timelister purple, Markedsføring pink; Oversikt and Administrasjon neutral). Active page: soft light pill, white bold text, stronger tile — no left bar. Bottom menu: changed 2026-11-10, see below.
- 2026-11-09 – Company page background: colour at both ends, plain grey in the middle where the cards are. Top: a light wash of the section's colour and one barely visible circle top right; bottom: a faint primary-blue wash and two quiet circles bottom left (`CompanyBackground` in `app/components/layout/page-backgrounds.tsx`). No footer bar on phones. The user rejected an aurora of colour blobs, contour lines, big rings, a grid and a coloured band with a large icon as ugly or too much: keep backgrounds subtle and at the edges.
- 2026-11-10 – Oversikt pages give weight to the domain's key destinations (Booking: Kalender and Timebestillinger): full-colour cards ("Full farge", not a soft tint) with one live number each, above the rows. Booking first, other domains copy it later.
- 2026-11-10 – Phone create action: a blue button with a text label ("Bestill ny avtale") sitting over the bottom menu, not a round icon-only + in or on top of the menu. The menu keeps its tabs where they are.
- 2026-11-10 – Bottom menu: the active tab's whole cell gets the background colour (no small pill or circle around the icon — the user found that very ugly). Inside a domain the menu takes the domain's colour (Booking teal, Tilbud orange, Timelister purple, Markedsføring pink); outside a domain it stays white with a blue active tab.
- 2026-11-10 – Phone header: a clear white ≡ (hamburger) top left opens the menu on a domain's top pages, instead of the avatar, so it's obvious what tapping there does. Pages below keep ‹ in that spot.
- 2026-11-10 – Notifications: rows like every other list (the domain's colour tile, title, the message on one muted line without links, the time); unread = bold title + a small blue dot, never a coloured row. Group by day like the appointment list. The bell's panel uses the same rows (no chevrons) and ends in "Se alle varsler"; on phones it drops full width under the blue bar and dims the page. No stat tiles, date filters or "rows per page" on the list.
- 2026-11-11 – Compact views everywhere: no unnecessary padding, margins or gaps. Space only to group or separate things (16px between page blocks on phones, 24px max on desktop), one side gutter per page (the shell's), no wrapper padding, no air under titles. Keep 44px touch targets. Details: `design-language.md` → Space and shape.

- 2026-11-14 – A form's primary button (Lagre, Send invitasjon…) is disabled until the form is valid, with one line in the bar saying what's missing ("Skriv inn en gyldig e-postadresse"), like the booking bar's "Velg minst én tjeneste". No error that only appears after pressing it. A global rule for every form: `ui-rules` rule 5.

- 2026-11-14 – Numbers that are 0 or empty aren't shown: no "0" rows, no empty "Følg opp" lists. A card with nothing left disappears; a page with nothing at all shows one calm empty state. Rule: `ui-rules` rule 1 (Tall).

## Defaults the user hasn't seen yet

Picked by Claude because the user prefers reacting to a result over more questions. Treat them as the default; move a line to "Decided" when the user confirms it, or replace it when they correct it.

- On company edit pages, "Lagre" sits inline at the end of the form on desktop (the phone bar is decided, see above), and there is no Avbryt button since the header's ‹ covers it.
- After a sketch, describe the changes from today as a short bullet list rather than showing a before screenshot.
