---
name: ui-rules
description: The app-wide rules for how portal.pitell's pages are structured and behave, so every page in every domain works and looks like part of one product — the four page types (Oversikt, Liste, Skjema, Tall), areas with an area switch and a fixed color, the page top, how things are created (the create button above the bottom menu and the desktop "Ny …" button), how create/edit form pages work, how saving and deleting work, and how every notification is shown (the flash toast). The booking domain is being rewritten first as the blueprint for the rest of the app. Use this whenever you implement, change, review or sketch any page, form, list, button, bottom menu, create/edit/delete flow or user message in this app, even for a small change and even if the user doesn't mention consistency. The page-sketch skill handles how things look; this skill handles structure and behavior.
---

# UI rules

These rules are for the **whole app**. They exist because the user hates design variance between pages: every page should feel like part of one product, and the user should never have to guess what a button does on this page versus another. When code and these rules disagree, follow the rules, and fix the code when you touch it. If a rule doesn't fit a new situation, ask the user and add the answer to the decision log at the bottom instead of improvising a one-off.

**How we get there: domain by domain, with booking as the blueprint.** The code is rewritten one domain at a time. Booking (`/company/booking/*`) goes first; when it's done it is the worked example every other domain copies (Tilbud, Timelister, Markedsføring, Administrasjon…). For each domain: survey every page, sketch the whole domain on these rules, get the user's approval, write the domain's map (`references/<domain>-domain.md`: its areas, colors and page-by-page status), then build. The booking map is `references/booking-domain.md`; use it as the template for the next map.

How to implement each rule (code shapes, where things live, what isn't built yet) is in `references/implementation.md`. Read it before writing code for any rule below.

## 1. Page types

Every page in the app is exactly one of these. If a page doesn't fit, ask the user before inventing a fifth.

| Type         | What it is                                                                                            | Anatomy                                                                                                                                                                                                                                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Oversikt** | Leads somewhere else (a domain's front page), or sums up one thing the user owns (like Bookingprofil) | Up to two key destinations first: full-colour cards with one live number each (`KeyDestinationCard`). Then cards of rows: colored tile or initials + name + one muted line + chevron, or a small "Endre" pill when the row opens an edit page. No other numbers or quick looks.                          |
| **Liste**    | Many things of one kind                                                                               | Area switch (if the area has two pages) → one list card: toolbar (filter/search), group strips, rows, count footer. Creating is the page's create action (rule 4).                                                                                                                                       |
| **Skjema**   | Create, edit or settings                                                                              | The form page template: fields in one card (or one card per section), Lagre bar (rule 5). No back link in the page (rule 3), no accordions, no status tiles above the form.                                                                                                                              |
| **Tall**     | Numbers to read                                                                                       | Month stepper (‹ November 2026 ›, in the URL) → one card of stat rows (muted label, big number, one muted comparison with the month before) → rows that open detail pages for the same month. No colored icon tiles, sentence case. Hide what's 0 or empty (no "0" rows); a card with nothing left goes. |

Detail pages for one item in a list (like an appointment) follow the detail pattern of the reference designs (page-sketch → patterns → Detail page).

## 2. Areas, switches and colors

- A domain is split into **areas**. An area is one page, or two pages that belong together (Kalender | Timebestillinger, Tjenester | Grupper).
- Two pages in one area share **one area switch**: the segmented control at the top of the page. Same component everywhere.
- Each area has a **fixed color** from the category palette. It is used for the area's tile wherever the area appears as a tile (the domain's Oversikt, later the sidebar). The same area never changes color, and area colors are never used for status.
- Each domain's areas and colors are listed in its map (`references/<domain>-domain.md`).

## 3. Page top

- Liste pages in a two-page area start with the area switch; the create button sits at the right on desktop.
- All other pages start with their first card. No visible page title (the breadcrumb and phone header name the page).
- **Up is always in the header, never in the page.** The user asked how to get back from Kalender to Booking on a phone; the browser's back button isn't the answer (easy to miss, gone when the app is saved to the home screen, and it goes wherever you came from, not one level up).
  - **Phone:** a domain's top pages (Oversikt, Booking, Timelister, Tilbud…) show the menu button, a white ≡ (hamburger) top left, labelled "Åpne meny". **Every page below them shows ‹ in its place**, going one level up. Its accessible name is "Tilbake til <parent>".
  - **Desktop:** the clickable breadcrumb ("Mitt selskap / Booking / Bookbar tid") is the way up; no ‹.
  - **No back links or buttons inside pages:** no "‹ Tilbake til …" above a form, no outline "Tilbake til …" buttons, no "Tilbake" that calls history back, no pairs of navigation buttons above the content. A link inside an empty or error state ("Til oversikt") is content, not navigation, and is fine.
  - **Up follows the domain map, not the URL.** When a page's parent in the map differs from its URL parent, the route tree says so (`up: '<route id>'`): Bookbar tid's URL sits under Kalender, but it belongs to Booking, so its ‹ goes to Booking. A page that belongs to one record (Last opp bilde → that Timebestilling) names the record from its loader data (`handle.up`).
  - **Up returns to the page as you left it:** a list's search, page and period stay (Timebestillinger with "Kari" on page 2 → open one → ‹ → the same "Kari", page 2).

## 4. Creating things

The user was confused when the bottom + on the Tjenester page created an appointment. So the rule is: **the create button always creates what the page you are on lists.**

- A list page that can create declares **one create action**: a label ("Bestill ny avtale", "Ny tjeneste", "Ny gruppe", "Nytt tilbud") and where it goes. That one declaration drives both buttons below, so they can never disagree.
- **Desktop:** a blue primary button at the right of the page toolbar, `+` icon and the label.
- **Phone:** a full-width blue button with `+` and the label, floating just above the bottom menu (same place and shape as a form page's Lagre bar). The bottom menu itself holds only its tabs. The page's own toolbar shows no create button on phones (that would be a second one).
- **Only on the list page itself.** One level down the button stops: a detail page, an upload page or anything else nested under a list shows **no create button** (the user wants it gone as soon as you open something). It is never inherited from a parent route.
- **Pages with nothing to create** (Oversikt, settings, statistics) show **no create button** at all. Never fall back to "Bestill ny avtale".
- Creating always opens its **own page** (a route like `…/create`), never a dialog, side panel or inline form on the list.
- Only offer create when the user is allowed to create there.

## 5. Create and edit pages (Skjema)

- Own route, title "Ny tjeneste" when creating, the item's name when editing. The way back is the header's ‹ (phone) or breadcrumb (desktop), rule 3.
- **Phone: the bottom menu is hidden** and a floating **Lagre** bar sits at the bottom (one full-width primary button, like the booking flow's bar). **Desktop:** Lagre at the end of the form, right-aligned.
- One primary action: **Lagre**, both for create and edit. No "Avbryt" button; the header's ‹ does that.
- Labels above fields. Short pairs side by side from `md`. No helper text unless it carries real information (a unit, a limit); optional fields say "(valgfritt)" in the label. Errors the server finds (a taken name, a conflict) sit under their field.
- **The primary button is disabled until the form is valid.** Everything the page can check itself (required fields, a valid e-mail, at least one role, start before end) keeps Lagre / Send invitasjon / … disabled, with **one line in the bar saying what's missing first** ("Skriv inn en gyldig e-postadresse", "Velg minst én rolle"), like the booking bar's "Velg minst én tjeneste". No errors that only appear after pressing the button. The server still validates and answers with a toast or a field error.
- **Delete** exists only on the edit page, as a quiet red text button at the bottom, never next to Lagre. It always asks first: title "Slett <name>?", text "Dette kan ikke angres." (plus what else gets deleted with it), buttons named by their outcome: "Slett <ting>" (destructive) and "Behold" (focused first). It is an alert dialog (`ConfirmDialog`): clicking outside doesn't close it.
- After Lagre or Slett, go back to the list and show a toast (rule 6). After creating, go back to the plain list (no search filled in).

## 6. Notifications are flash toasts

Every message about the result of something the user just did (saved, created, deleted, sent, invited, failed) is shown the same way: **the flash toast**. The server puts the message in the short-lived `__flash` cookie and `FlashMessageBanner` shows it as a toast at the top of the screen. Success, info and warning close after 5 seconds (paused while hovered or focused); **errors stay until closed**, so they can be read and acted on (WCAG 2.2.1).

- When the action navigates: `redirectWithSuccess` / `redirectWithError` / `redirectWithInfo`.
- When the action stays on the page: return the response with the `Set-Cookie` header from `setFlashMessage`.
- Four types only: success, error, info, warning. Errors are announced with `role="alert"`, the rest with `role="status"`.
- Text: short, past tense for success ("Tjeneste lagret", "Tjeneste slettet", "Invitasjon sendt"). Errors say what failed and, if useful, what to do ("Kunne ikke slette tjenesten. Prøv igjen."). No "!", no "vellykket".
- **Not for results:** sonner `toast()` (no Toaster is mounted, so those calls show nothing), inline success boxes, `alert()`, or a second toast design.

What stays on the page instead of a toast:

- field validation errors (under the field),
- states that must stay visible: a page that failed to load or a thing that's gone (`PageNotice`: "Prøv igjen" for load errors, a link back for not-found), empty states, the booking bar's message strip ("Velg minst én tjeneste"),
- confirmations before something destructive (the delete dialog).

## 7. Lists and rows

- One card per list, rows that open the item (whole row is the link, chevron at the end), no buttons inside rows.
- One row style per kind of thing across the whole app: an appointment looks the same in every list it appears in (the Timebestillinger row), and so on.
- Everything else: lead (tile, time or initials) + title + one muted line + trailing value + chevron.
- Search at the top of the card when it helps; group strips with category colors when items belong to groups; a count at the bottom; an empty state with at most one action (never a second create button; the page's create button already does that).
- Look and exact anatomy: page-sketch skill, `references/patterns.md`.

## 8. Every screen gets an e2e test of its flow

When a sketched screen (or set of screens) is built, add a Playwright test that walks its flow the way a user would, and run it before calling the work done. It is part of "done", not a follow-up.

- One spec per area or flow in `tests/e2e/<area>.spec.ts` (company pages) or `tests/e2e-booking/` (the public booking flow).
- Walk the real path: arrive the way a user does (overview row, area switch, create button), save, see the toast and the new row, open it, change or delete it, see the result. Cover desktop, plus a phone check of what differs there (the create button above the bottom menu, the hidden bottom menu on form pages).
- Assert what the rules promise: the right page and URL, `aria-current` on the area switch, the toast text, focus on "Behold" in delete dialogs, empty states.
- Leave the database as you found it: clean the tables you touch in `beforeEach`/`afterAll`.
- How: `references/implementation.md` → End-to-end tests.

## 9. Everywhere

- One primary (blue) action per screen.
- Internal links with React Router `Link`/`NavLink`, never raw `<a>`.
- Touch targets 44px on phones.
- Norwegian, minimal copy: labels and titles, no helper paragraphs, sentence case.
- Colors, type, spacing: page-sketch skill, `references/design-language.md`.

## 10. Backend and API shape is the user's call

When a UI change needs the backend to change (a new endpoint, a new field on a request or response DTO, a changed type), **ask the user how the API should look before writing it.** Propose one shape in a sentence or a short Kotlin snippet and wait. Don't decide it alone.

What the user wants, from decisions so far:

- **One list of objects, not parallel fields.** A booking's services are `services: List<ServiceQuantityDto>` (`serviceId`, `quantity`), not `serviceIds` plus an optional `serviceQuantities` beside it.
- **Change the field rather than bolt an optional one on.** Update every caller and test to the new shape instead of keeping the old field "for compatibility".

## Decision log

Newest last. Add a dated line when the user decides something new about how the app behaves.

- 2026-11-07 – The bottom + creates what the current page lists (option A). Icon only, no label under it. No + on pages with nothing to create.
- 2026-11-07 – Form pages on phones hide the bottom menu and show a floating Lagre bar.
- 2026-11-07 – Every notification about an action's result uses the flash-cookie toast (`FlashMessageBanner`).
- 2026-11-07 – Create and edit open on their own page; delete only on the edit page, behind a confirm dialog. (Also in page-sketch preferences.)
- 2026-11-07 – App-wide page system: four page types (Oversikt, Liste, Skjema, Tall), areas with one area switch and a fixed color, only Skjema pages have a back link, Oversikt pages have no quick look at other pages' data. Approved on the booking domain sketch; the rules apply to the whole app.
- 2026-11-07 – The booking domain is rewritten first and is the blueprint for every other domain. Its map: `references/booking-domain.md`.
- 2026-11-07 – Best-practice review (React Router docs, Material 3, WCAG 2.2, NN/g, Polaris): structure kept; flash-cookie secret (SESSION_SECRET; a random fallback if it's missing, so set it in production), error toasts stay open, field border/placeholder contrast, scroll padding under floating bars, alert-dialog confirms with outcome labels, guardrail tests. Details in `references/implementation.md`.
- 2026-11-07 – Every sketched screen that gets built also gets an e2e test of its flow (rule 8), written and run as part of the build.
- 2026-11-07 – Up lives in the header: ‹ on phones on every page below a domain's top pages, the breadcrumb on desktop. No back links inside pages, including the form template's "‹ Tilbake til …" (replaces "only Skjema pages have a back link"). Up follows the domain map (`up` in the route tree), and returns to a list as it was left.
- 2026-11-09 – Tall pages pick any past month with a month stepper (‹ November 2026 ›, `?maned=2026-10`, no parameter = this month, › off on this month) instead of a Denne | Forrige switch. Comparisons are with the month before; Prognose only on the current month. Detail pages keep the month, and their ‹ returns to it. Appointments are "avtaler" in copy, never "timer".
- 2026-11-10 – API and DTO shape is the user's decision (rule 10): ask before changing a request/response shape; prefer one list of objects (`services: List<ServiceQuantityDto>`) over parallel or optional side fields.
- 2026-11-10 – Oversikt pages weight a domain's key destinations: up to two full-colour cards with one live number each, above the area rows (replaces "no number tiles, no hero tiles, no quick look" for those cards only). Booking: Kalender ("n avtaler i dag") and Timebestillinger ("n kommende").
- 2026-11-10 – The phone create button is a full-width blue button with `+` and its label ("Bestill ny avtale") floating just above the bottom menu, not a round icon-only + inside it (replaces the 2026-11-07 "icon only" decision). It shows only on the list page itself: pages nested below a list (detail, upload…) show none, and nothing is inherited from parent routes. Appointments are created with "Bestill ny avtale".
- 2026-11-10 – Bottom menu: the active tab fills its whole cell with the domain's tint and ink (no pill around the icon), and inside a domain the bar takes a light wash of the domain's colour. Outside a domain it stays white with a blue active tab.
- 2026-11-10 – The phone menu button is a white ≡ (hamburger) top left on a domain's top pages, replacing the avatar, so it's obvious that it opens the menu. Pages below keep ‹ there (no ≡ next to it). The account stays at the bottom of the menu.
- 2026-11-10 – Varsler is a Liste page (Alle | Uleste in the URL as `?vis=uleste`, grouped by day, count and paging, no create button). Every notification row opens the notification's own page, which marks it read and shows the message and the appointment it is about as the Timebestillinger row. The bell opens a panel with the latest notifications and "Se alle varsler": a popover on desktop, full width under the bar with the page dimmed on phones. A page that shows one record names itself in the header with `handle.title`.
- 2026-11-11 – The customer's cancel page is its own confirmation: "Avbestille timen?", the appointment, "Dette kan ikke angres." and "Behold timen" | "Avbestill timen" in the booking bar, with no second dialog (the delete dialog in rule 5 is for company edit pages). Both cancel routes (Mine bookinger and the email link) render the same view. After cancelling: Mine bookinger, or the salon's booking page from the email link, with the toast "Timen er avbestilt".
- 2026-11-11 – Compact layout app-wide: no space that doesn't group or separate something. One side gutter (the shell's `<main>`; templates use `Container gutter="none"`), 16px between page blocks (24px max on desktop), no padding on plain wrappers. Touch targets stay 44px. Booking public pages were audited first (`page-sketch` → design-language → Space and shape).
- 2026-11-11 – Dates in forms are a plain `DateField` (one click picks the day); the user rejected a custom day strip as too complicated. A period over several days is Starter (date + time) and Slutter (date + time) rows with "Hele dagen" first, so the times can only mean start and end of one continuous period. Nytt fravær saves one period at a time.
- 2026-11-11 – The company Oversikt (/company) follows the Oversikt type: key cards Kalender ("n avtaler i dag") and Varsler ("n uleste"), one row per area the user can open (Booking with "n kommende avtaler"), and the company as one row with org.nr and "Endre" for admins. The registry tiles, address panels and admin lists are gone.
- 2026-11-12 – A page that can't show its content shows `PageNotice`: one centred card with an icon, a title, one line and one way forward. Load errors: amber cloud, "Prøv igjen" reloads the data in place, never the raw error text. Not-found: blue icon and a link back, no retry. The small `Notice` stays for messages inside forms. A backend 5xx still shows the app-wide problems page.
- 2026-11-13 – Administrasjon (/company/admin) follows the Oversikt type: key cards Ansatte (sky, "n ansatte") and Kontakter (plum, "n kontakter"), then the company row with "Endre" and Statistikk as rows. The company row and area rows are shared (`app/routes/company/_components/overview-rows.tsx`). Admin's nested pages get their own sketches one at a time.
- 2026-11-14 – Every form's primary button (Lagre, Send invitasjon…) is disabled until the form is valid, with one line in the bar saying what's missing (rule 5). Applies to every form in every domain; fix older forms when you touch them.
- 2026-11-14 – After creating, go back to the plain list with the toast; don't fill in a search to show the new item (Ny kontakt). A long paged list may have the new item on another page, and that's fine.
- 2026-11-14 – Statistics never show 0: a stat or list with nothing in it is left out, a card with nothing left disappears, and a page with nothing at all shows one empty state. Applies to every Tall page and stat card.
