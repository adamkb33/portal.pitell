# Implementing the UI rules

Code and current status for each rule in `SKILL.md`. Use the built pieces below; don't hand-write a second version of them.

Note: the bottom menu shows below `lg` (1024px) and the sidebar from `lg`, so "phone" in the rules means below `lg` and "desktop" means `lg` and up.

## Rule 1 · Create action (one declaration, two buttons)

Status: **built.**

- `app/lib/routing/create-action.ts` — types (`CreateAction`, `CreateActionHandle`), `resolveCreateAction()` (only the page being shown counts, i.e. the deepest match; nothing is inherited from parent routes; the function form gets the page's own loader data) and `useCreateAction()`. Tests: `create-action.test.ts`; guardrail: `app/tests/design-guardrails.test.ts` fails when a `*.layout.tsx` declares `createAction` (it would be ignored).
- `app/routes/_components/page-create-button.tsx` — `useAllowedCreateAction()` (also checks `requires` against the user's sidebar branches) and `PageCreateButton` (the desktop button, `hidden lg:inline-flex`).
- The phone button (`app/routes/_components/mobile-sidebar/mobile-sidebar.tsx`) renders from `useAllowedCreateAction()`: a full-width `Button size="lg"` with `+` and the label, in the fixed bottom container just above the `<nav>` (outside it, so the nav holds only tabs), nothing when the page has no action. `app/routes/root.layout.tsx` gives the page extra bottom padding while it shows (`hasMobileCreateButton`), and `app/app.css` raises `scroll-padding-bottom` via `[data-bottom-menu-create]`.

To give a list page a create action, declare it in the **list page's own route module** (the section layout's index route, `<name>.route.tsx`), never on the layout. Pages nested below it (detail, upload, edit) then get no create button without having to opt out:

```ts
import type { CreateActionHandle } from '~/lib/routing/create-action';

export const handle = {
  createAction: { label: 'Ny tjeneste', to: ROUTES_MAP['company.booking.admin.services.create'].href },
} satisfies CreateActionHandle;
```

- Add `requires: '<sidebar branch id>'` when the target needs a permission the page itself doesn't guard (Bestill ny avtale on Kalender: `requires: 'company.booking.appointments'`).
- Then put `<PageCreateButton />` at the right of the page's toolbar. Don't add any other "Ny …" button to the page (not in the toolbar on phones, not in empty states).
- Route files that only re-export another module must re-export `handle` too (see `app/routes/company/booking/admin/services/*/…route.tsx`).

Declared today: Timebestillinger and Kalender (Bestill ny avtale), Tjenester and a group's Tjenester (Ny tjeneste), Grupper (Ny gruppe), Bookbar tid (Ny bookbar tid), Fravær (Nytt fravær), Kontakter (Ny kontakt), Ansatte (Inviter ansatt), Tilbud (Nytt tilbud). Every other page, including everything nested below these lists, has no create button.

`PageCreateButton` takes `size` to match neighbouring buttons (`size="sm"` in the old table headers and toolbars). In the shared table component pass it as `primaryAction` and leave out `mobilePrimaryAction`.

## Rule 2 · Form pages

Status: **built.**

- Mark every create/edit route: `export const handle: FormPageHandle = { formPage: true };` (`FormPageHandle` from `create-action.ts`). `app/routes/root.layout.tsx` hides the bottom menu when any matched route is a form page (`useIsFormPage()`).
- `CompanyFormPageTemplate` (`app/ui/templates/company-form-page-template.tsx`): pass `submit={{ form: '<form id>', loading }}` for the Lagre bar (floating below `lg`, inline at the end of the card from `lg`). Options: `label` (default "Lagre"; only change it when the action does more than save, e.g. "Send invitasjon", "Lagre utkast"), `disabled`, and `message` for one short line that belongs with the button (a running sum like "Sum: 1 250 kr", or why it's disabled). Every company form page uses it now; the old `footer` prop is unused and shouldn't come back. It has no back link (removed with the header ‹); don't add one back.
- Optional fields say so in the label ("E-post (valgfritt)") instead of a helper sentence.
- Labels with units ("Pris (kr)", "Varighet (min)"), short number pairs side by side even on phones, no helper text.
- Delete on the edit page, built examples:
  - the service form, `app/routes/company/booking/admin/service-groups/services/_components/service-form-page.tsx` (`intent === 'delete'` branch in its edit route's action);
  - the group form, `…/service-groups/_components/service-group-form-page.tsx` (posts to the existing delete API route). Its dialog says what else gets deleted ("De 2 tjenestene i gruppen slettes også."), because the backend deletes a group's services with it. Say so whenever a delete takes other data with it.
- After saving: `redirectWithSuccess(…, '<Ting> lagret')` back to the list.

## Page top · Up in the header

Status: **built** (2026-11-07).

- `app/components/layout/navbar.tsx` builds the crumbs and asks `upCrumb(crumbs)` (`app/lib/routing/breadcrumbs.ts`) for the page one level up. There is one when the trail has 3+ crumbs (root → section → this page); then the phone header (below `lg`) shows a ‹ `Link` labelled "Tilbake til <parent>" where the ≡ menu button sits on top pages. Desktop uses the breadcrumb links.
- **Parent ≠ URL parent:** set `up: '<route id>'` on the branch in `app/lib/routing/company/company.routes.ts` (type in `route-types.ts`). `buildCrumbs` follows it (`resolveUps`), so the breadcrumb and the ‹ agree. Booking examples: Bookbar tid, Tjenester, Grupper, Lojalitetsprogram → `company.booking`; Ny bookbar tid and its edit page → `company.booking.schedule.availabilities`.
- **Parent is one record:** export `handle: UpHandle = { up: (loaderData) => ({ label, href }) }` (`app/lib/routing/up-link.ts`); the navbar inserts it before the current page (`withUpOverride`). Example: Last opp bilde → its Timebestilling. When the page's parent is already in the trail but must open with a search the page knows (a Statistikk detail page → Statistikk for the month it shows), return `{ label, href, search }`; `crumbHref` then uses that search instead of the remembered one. When a page can be reached from two places (Ny time from Kalender or Timebestillinger), the starting page passes `?fra=…` and the page's `handle.up` returns that page with `replacesParent: true`; it then takes the tree parent's place in the trail.
- **The page is one record:** export `handle: TitleHandle = { title: (loaderData) => name }` (`app/lib/routing/up-link.ts`); the navbar renames the current page in the phone header and the breadcrumb (`withTitle`). Only the page being shown counts. Example: a notification's page is "Ny timebestilling", not the route's "Vis varsel".
- **As you left it:** the navbar calls `useRememberSearch()` and wraps every up/breadcrumb link in `crumbHref(crumb)` (the remembered search via `withLastSearch`, unless the page named one), so a list's query (`?search=…&page=…`, `?periode=tidligere`) comes back. Remembered per pathname in the browser tab only.
- When the deepest matching branch for a URL is wrong, fix the route tree (`isBetterTrail`: deeper wins, then more href segments, then fewer `:params`), not the page.
- Tests: `app/lib/routing/breadcrumbs.test.ts`; e2e `goUp()` in `tests/e2e/admin-navigation.spec.ts` (‹ on phones, breadcrumb on desktop) and the phone test in `tests/e2e/booking-availability.spec.ts`.

## App chrome · top bar, sidebar, phone menu, bottom menu

- Files: `app/routes/root.layout.tsx` (header shell, aside), `app/components/layout/navbar.tsx` + `navbar-controls.tsx` (top bar contents), `app/routes/_components/sidebar.tsx` (sidebar and phone menu), `sidebar-account.tsx` (account rows / ⋯ menu), `mobile-sidebar/mobile-sidebar.tsx` (phone menu sheet + bottom menu), `.app-sidebar` in `app/app.css` (navy background and its decoration).
- Colors come from tokens only: `chrome-*` on the navy (`chrome`, `chrome-hover`, `chrome-active`, `chrome-raised`, `chrome-border`, `chrome-text`, `chrome-text-muted`, `chrome-accent`), `on-brand*` on the blue (`on-brand`, `on-brand-muted`, `on-brand-hover`, `on-brand-decoration`). No raw `white/…` or hex, and don't re-map page tokens inside the sidebar (the old `.app-sidebar` did; it made `interactive` mean light blue there).
- The logo on navy is `<PTLLogo onDark />`.
- Bottom menu colour: `sectionCategory(pathname)` (`app/components/layout/page-backgrounds.tsx`, prefixes from `ROUTES_MAP`) sets `--area`, `--area-tint`, `--area-ink` on the fixed container. Bar: `--area` 5% on white, border 30%; active tab: the whole cell in `--color-category-*-tint` with `--color-category-*-ink` (≥ 4.5:1 for all four categories; a 20% tint drops orange to 4.3:1). Outside a domain: white bar, `surface-accent-strong` + `interactive` active tab.
- e2e: `tests/e2e/app-shell.spec.ts`.

## Rule 3 · Flash toasts

Status: **built.**

- Server helpers: `app/lib/flash-message.server.ts` — `redirectWithSuccess`, `redirectWithError`, `redirectWithInfo`, `redirectWithWarning`, `setFlashMessage`.
- Display: `app/routes/_components/flash-message-banner.tsx`, mounted once in `app/routes/root.layout.tsx`; the root loader reads the cookie on every load.

Navigating after the action:

```ts
return redirectWithSuccess(request, ROUTES_MAP['company.booking.admin.services'].href, 'Tjeneste lagret');
```

Staying on the page (including fetcher actions; the root loader revalidates after actions, which picks up the cookie):

```ts
const flash = await setFlashMessage(request, { type: 'success', text: 'Endringer lagret' });
return data({ ok: true }, { headers: { 'Set-Cookie': flash } });
```

If a purely client-side event ever needs a message (no server action involved), extend `FlashMessageBanner` to also take a client message so there is still one design. Don't mount sonner's `Toaster` or add another toast style.

## Accessibility and safety details (from the best-practice review, 2026-11-07)

- **Flash cookie secret:** `app/lib/flash-message.server.ts` signs the toast cookie with `SESSION_SECRET` if set, otherwise with a random secret made at server start (never a fixed string, which would let anyone forge a toast). No setup needed; only set `SESSION_SECRET` if the app runs as several instances behind a load balancer. The user chose this over requiring the variable (2026-11-07).
- **Toasts:** `FlashMessageBanner` keeps errors open until closed and pauses the 5-second timer for the others while hovered or focused; `role="alert"` for errors, `role="status"` otherwise.
- **Fields:** inputs, textareas and select triggers use `border-field-border` (#8592a6, 3.15:1) and `placeholder:text-text-placeholder` (#64748b, 4.76:1); booking fields use `border-booking-field-border`. Cards keep the lighter `border-border`. Any custom field-like trigger (a `Button` acting as a select) gets `border-field-border` too.
- **Floating bars:** anything fixed to the bottom on phones carries `data-floating-action-bar`; `app/app.css` then sets `scroll-padding-bottom` so the browser scrolls focused fields clear of it (WCAG 2.4.11).
- **Confirm dialogs:** `ConfirmDialog` (`app/ui/organisms/confirm-dialog.tsx`) is an alert dialog: focus starts on the cancel button, outside clicks don't close it. `DeleteConfirmDialog` defaults the safe button to "Behold"; pass `confirmText="Slett <ting>"`.
- **Guardrails:** `app/tests/design-guardrails.test.ts` fails the test run on hex colors in Tailwind classes, raw gray palette classes or legacy `~/components/ui` imports in the booking domain, and on any new `sonner` or legacy-component import app-wide. Its known-violation lists may only shrink: fix a file, then remove it from the list. When the next domain is rebuilt, add its folder to the strict checks.
- **Index routes and plain form posts:** list/create/edit pages are index routes under a layout, so a POST must go to `…?index` (React Router's `<Form>` and `useSubmit` add it). A hand-written `<form action>` without `?index` hits the layout and gets 405.
- **Not done yet:** Playwright screenshot tests (`toHaveScreenshot`) for each booking page at 375 and 1280 px. They need the e2e environment (`playwright.config.ts` starts the backend and a test database) to create and review baselines.

## End-to-end tests (rule 8)

- Run: `npx playwright test tests/e2e/<area>.spec.ts --project=company`. Playwright starts its own stack (Docker database, backend from the sibling `pitell` repo, portal on its own port) and seeds it through the `environment` project, so it needs Docker running and takes a few minutes on a cold start. It does not touch the dev server or dev database.
- Sign in with `signInAsCompanyAdmin` + `portalCookieValue` from `tests/e2e/loyalty.helpers.ts`, then `context.addCookies([{ name: 'access_token', value, url: baseURL }])`. The seeded admin is company 1, booking profile 1.
- Seed (`tests/e2e-booking/fixtures.ts` → `seedBookingFixture`): services 1–4 in three groups, working hours Mon–Fri 08–18 and Sat 08–16 (so bookable time on a Sunday is stored as entered). Use the `db` fixture for cleanup and extra rows.
- Custom pickers (date, time) are popovers; set values through a create page's URL parameters when the page supports them, and test the flow (save → list → open → change/delete) through the UI.
- Prefer roles and visible text over test ids: `getByRole('navigation', { name: … })` for switches and the bottom menu, `getByRole('status')` / `getByRole('alertdialog')` for toasts and confirms.
- Example: `tests/e2e/booking-availability.spec.ts` (Tilgjengelighet).

## Known violations (fix when you touch these files)

- In-page back links outside booking, now doubled by the header ‹ (Page top). Remove them when the domain is rebuilt: `company/admin/statistics`, `company/notifications/view`, `company/timesheet/edit-range` and `/edit-hours`, `company/marketing/create` and `/detail`, `company/offer/catalog` and `/detail`, and the `system-admin` pages (companies, users, diagnostics, smtp). Find them with `rg "Tilbake" app/routes`. Links inside an empty or error state ("Til oversikt") are fine.

- Custom form pages that don't use `CompanyFormPageTemplate` yet have no `formPage` handle and no Lagre bar (rule 2): `company/marketing/create`, `company/timesheet/edit-range`, `company/booking/schedule/availabilities/edit` (all under `app/routes/`). Move each onto the template (or give it the same `submit` bar) when you touch it.
- Any other list page that hand-writes a "Ny …" / "Legg til …" button instead of declaring a create action (rule 1). Find them with `rg "\.create'\]\.href|\.invite'\]\.href" app/routes`.
- The phone header shows the route-tree label ("Opprett tjenestegruppe", "Rediger tjeneste") instead of "Ny gruppe" / the item's name (labels in `app/lib/routing/company/company.routes.ts`). Fix a create page by renaming its route label; fix an edit page with `handle.title` (Page top).
- `app/components/pickers/contact-picker.tsx`, `app/routes/company/admin/employees/tables/invites.table.tsx` — sonner `toast.success(...)`, which shows nothing today (rule 3).
- Old tables with Rediger/Slett on every row on other admin pages (rule 4).
