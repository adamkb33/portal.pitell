# Mobile Sidebar Requirements For `portal.pitell`

## Purpose

This document defines the requirements for the authenticated mobile sidebar navigation used in this project.

It is specific to:

- `app/routes/root.layout.tsx`
- `app/ui/layout/navbar.tsx`
- `app/routes/_components/sidebar.tsx`
- `app/routes/_components/mobile-sidebar/mobile-sidebar.tsx`
- `app/lib/route-tree.ts`

This document is not a generic mobile-nav spec. It describes how mobile sidebar navigation must work with this repo's route tree, role filtering, product filtering, hidden routes, and existing layout shell.

---

## Scope

This work applies only to the sidebar navigation used for authenticated sidebar layouts.

Included:

- company area mobile sidebar
- system admin mobile sidebar
- nested sidebar drilldown on mobile
- integration with the existing root app shell

Excluded for now:

- public booking flow navigation
- top header auth/user dropdown navigation
- desktop sidebar redesign
- route-tree permission logic changes

---

## Source Of Truth

### Route Source

The mobile sidebar must use the same route data as the desktop sidebar.

Route data comes from:

- `createNavigation(...)` in `app/lib/route-tree.ts`
- `loaderData.userNavigation[RoutePlaceMent.SIDEBAR]` in `app/routes/root.layout.tsx`

The mobile sidebar must not define its own separate route map.

### Route Type

The sidebar consumes `RouteBranch`.

```ts
export type RouteBranch = {
  id: string;
  href: string;
  label?: string;
  accessType?: Access;
  placement?: RoutePlaceMent;
  hidden?: boolean;
  category: BrachCategory;
  userRoles?: UserRole[];
  companyRoles?: CompanyRole[];
  iconName?: IconName;
  children?: RouteBranch[];
  excludeLayout?: boolean;
};
```

Notes for this project:

- `href` is the navigation target.
- `label` is the UI label.
- `iconName` maps through `getIcon(...)` in `app/lib/route-icon-map.ts`.
- `children` may be nested multiple levels deep.
- `hidden` means the route must not be rendered as a visible nav item.
- role and product filtering are already handled upstream by `createNavigation(...)`.

---

## Placement Rules

The mobile sidebar is only for `RoutePlaceMent.SIDEBAR`.

It must not render routes from:

- `RoutePlaceMent.NAVIGATION`
- `RoutePlaceMent.FOOTER`

The mobile sidebar may receive already-filtered sidebar branches from `root.layout.tsx`, but it must still exclude `hidden: true` items from visible navigation.

---

## Real Sidebar Structures In This Repo

### Root Sidebar Branches

At the root sidebar level, this project currently uses:

- `system-admin`
- `company`

### `system-admin`

Visible child sections under `system-admin` currently include:

- `system-admin.users`
- `system-admin.companies`
- `system-admin.smtp`

Example nested routes:

- `system-admin.users.invite`
- `system-admin.users.details`
- `system-admin.companies.create`
- `system-admin.companies.roles`
- `system-admin.companies.products`
- `system-admin.smtp.diagnostics`

### `company`

Visible child sections under `company` currently include:

- `company.admin`
- `company.booking`
- `company.notifications`
- `company.timesheet`

Important hidden children under `company` include:

- `company.request-role-delete`

### `company.admin`

Visible child sections:

- `company.admin.settings`
- `company.admin.employees`
- `company.admin.contacts`

Hidden children:

- `company.admin.employees.invite`
- `company.admin.employees.edit`
- `company.admin.contacts.create`
- `company.admin.contacts.edit`

### `company.booking`

Visible child sections:

- `company.booking.admin`
- `company.booking.profile`
- `company.booking.schedule-unavailability`
- `company.booking.appointments`
- `company.booking.schedule`

Important nested children:

- `company.booking.admin.service-groups`
- `company.booking.admin.services`
- `company.booking.appointments.create`

Hidden booking children that still matter for active-state and drilldown:

- `company.booking.admin.settings`
- `company.booking.admin.service-groups.create`
- `company.booking.admin.service-groups.edit`
- `company.booking.admin.services.create`
- `company.booking.admin.services.edit`
- `company.booking.profile.create`
- `company.booking.profile.edit`
- `company.booking.schedule-unavailability.create`
- `company.booking.appointments.upload-image`
- `company.booking.schedule.availabilities`
- `company.booking.schedule.availabilities.edit`

### `company.notifications`

Visible child sections:

- none today

Hidden children:

- `company.notifications.view` with href `/company/notifications/:id`

### `company.timesheet`

Visible child sections:

- `company.timesheet.admin`
- `company.timesheet.register`

Visible nested child:

- `company.timesheet.admin.submissions`

Hidden children:

- `company.timesheet.edit-range` with href `/company/timesheets/range/:id`
- `company.timesheet.edit-hours` with href `/company/timesheets/hours/:id`

---

## Mobile Navigation Model For This Repo

### Important Clarification

The mobile primary navigation should not use the raw root sidebar array as its visible tab set.

Reason:

- the raw root sidebar array is often just `company` or `company + system-admin`
- that is too coarse for the actual company UX
- the desktop sidebar already behaves like a drilldown into the active root branch

### Required Primary Level

The mobile bottom navigation must use the visible children of the active root sidebar branch.

Examples:

- on `/company/...`, the primary mobile items should come from `company.children`
- on `/system-admin/...`, the primary mobile items should come from `system-admin.children`

If no route is active yet, default to the first visible root sidebar branch and use its visible children.

### Examples

On company pages, primary mobile items should typically be:

- `Administrasjon`
- `Booking`
- `Varsler`
- `Timelister`

On system admin pages, primary mobile items should typically be:

- `Brukere`
- `Selskaper`
- `SMTP`

This requirement is project-specific and should stay aligned with desktop drilldown behavior.

---

## Hidden Route Behavior

Hidden routes must not render as selectable items in the bottom nav or drawer.

However, hidden routes must still affect:

- active trail detection
- which parent section is highlighted
- which drawer level is considered current
- back behavior

Examples:

- `/company/notifications/123` should keep `company.notifications` active
- `/company/timesheets/range/42` should keep `company.timesheet` active
- `/company/booking/admin/service-groups/services/edit` should keep the booking admin trail active

### Parameterized Hrefs

This repo includes hidden routes with parameter segments in `href`, for example:

- `/company/notifications/:id`
- `/company/timesheets/range/:id`
- `/company/timesheets/hours/:id`

The mobile sidebar requirements must account for these project routes.

A literal equality check against `href` is not enough to identify every active hidden route. The implementation must preserve the correct parent active state for parameterized child routes.

---

## Bottom Navigation Requirements

### Layout

The primary mobile nav must:

- be fixed to the bottom of the viewport
- span the full available width
- stay mobile-only
- support safe-area bottom inset
- use equal-width items
- use the same inner container pattern as the drawer surface
- use the repo token system for backgrounds, accents, text, and borders

### Item Content

Each primary item should display:

- icon when `iconName` exists
- label

Labels should truncate rather than wrap badly.

### Visible Count

The component should support:

```ts
maxVisible?: number;
```

Default:

```ts
maxVisible = 5;
```

If the active root section has more visible children than `maxVisible`, the last slot is reserved for overflow paging.

---

## Overflow Paging Requirements

If all visible primary items fit:

- render them all
- do not render `Mer`

If they do not fit:

- reserve the last slot for the paging control
- render `maxVisible - 1` real route items
- keep all slots equal width

### Paging Control

For this repo, the control should behave like:

- `Mer` on non-final pages
- `Start` on the final page

Changing page must:

- update the visible primary items
- close any open nested drawer
- clear drilldown state

---

## Nested Drawer Requirements

### State Source Of Truth

The URL is the source of truth for navigation state.

That means:

- active route state comes from `location.pathname`
- current branch context is derived from the route tree plus the URL
- open/closed drawer state is ephemeral UI state
- do not persist drawer-open state in `localStorage`

The drawer may initialize from the current URL when explicitly opened from the mobile menu trigger, but route identity must always come from the URL.

### When Drawer Opens

Clicking a visible mobile nav item must always navigate first.

After navigation:

- if the route has visible children, open the nested drawer
- if the route has no visible children, do not keep the drawer open

This rule applies to:

- top-level primary items such as `company.booking`
- nested drawer items such as `company.booking.admin`
- deeper nested drawer items such as `company.booking.admin.service-groups`

### Drawer State Model

Use stack-based drilldown state.

Examples for this repo:

```ts
drawerStack = [company.booking];
drawerStack = [company.booking, company.booking.admin];
drawerStack = [company.booking, company.booking.admin, company.booking.admin.service - groups];
```

When a leaf route is selected:

```ts
drawerStack = [];
```

### Drawer Persistence

The drawer should remain open while moving deeper through visible children.

The drawer should close when:

- the selected target is terminal in the visible nav tree
- the user manually closes it
- the backdrop is clicked
- the primary page changes through `Mer` or `Start`

The drawer should not close on every route change.

Expected behavior:

- navigating from one branch to another branch with visible children may keep the drawer open and update its content
- navigating to a terminal child route must close the drawer
- external navigations such as breadcrumbs may close the drawer

### Branch-Aware Click Behavior

If the current URL is already inside a branch, clicking that same branch should not navigate back to the branch root.

Examples:

- if the user is on `/company/booking/profile`, clicking `Booking` should keep the user inside the `Booking` branch and show the relevant drawer state
- if the user is on `/company/booking/schedule`, clicking `Booking` should not route back to `/company/booking`
- if the user clicks another section they are not currently inside, navigation should proceed normally

This rule applies both to:

- primary bottom-nav items
- parent-capable items inside the drawer

---

## Drawer UI Requirements

The nested drawer must:

- appear above the fixed bottom nav
- be fixed-positioned
- use the same radius system throughout the drawer and dock
- use the existing surface/sidebar token system
- support scrolling for long lists
- include a blurred/dimmed backdrop
- use the same inner container treatment as the bottom dock, so width, inset, and spacing feel like one system

### Visual Rules

The mobile drawer and bottom nav should feel compact, modern, and smooth.

Required visual constraints:

- avoid excessive borders
- prefer token-driven background changes over heavy outlines and shadows
- keep border radius consistent across header controls, rows, tabs, and containers
- keep spacing and control sizes consistent between the drawer header and the drawer rows beneath it
- avoid unnecessary helper text

Hierarchy should be expressed primarily through:

- URL-driven active background state
- icon treatment
- layout and spacing

Not through:

- extra explanatory text
- inactive rows that look active
- inconsistent container widths

### Drawer Header

The drawer header must include:

- back button
- current section label
- close button

### Back Behavior

Back should pop one level from the drilldown stack.

Project examples:

- from `company.booking.admin.service-groups` back goes to `company.booking.admin`
- from `company.booking.admin` back goes to `company.booking`
- from `company.booking` back closes the drawer

The header controls should visually use the same size rhythm and surface treatment as the controls used in the drawer rows.

---

## Active State Requirements

Primary items and drawer items must support active styling when:

```ts
location.pathname === branch.href;
```

or when the current URL is within that branch subtree:

```ts
location.pathname.startsWith(`${branch.href}/`);
```

This repo also needs parent activation for hidden parameterized routes, not only visible exact matches.

### Highlighting Rule

Background-highlighted state should be reserved for the route or branch that is active from the URL.

Inactive items may still differ slightly for hierarchy, but they must not look selected.

Expected visual rule:

- active route or active branch: highlighted background using sidebar accent tokens
- inactive items: neutral token-based background or transparent state
- parent/child differentiation must not make an inactive item look active

---

## React Router Integration

The implementation should stay on React Router APIs already used in this repo:

```ts
import { Link, useLocation } from 'react-router';
```

Use React Router `Link` components for route navigation in the mobile sidebar. Do not use plain `<a>` tags in this component.

The component must work inside the existing shell in `app/routes/root.layout.tsx`.

The mobile open action currently originates from:

- `onOpenSidebar` passed into `Navbar`

The mobile sidebar requirements should remain compatible with that trigger, even if the internal mobile UX becomes a bottom nav plus drawer instead of a right-side sheet.

---

## Layout Integration Requirements

Any mobile sidebar redesign must coordinate with:

- root header in `app/routes/root.layout.tsx`
- content section spacing in `app/routes/root.layout.tsx`
- footer spacing in `app/routes/root.layout.tsx`

The fixed bottom nav must not cover:

- the last actionable content in a page
- drawer content
- footer content

Safe-area and bottom spacing must be part of the implementation requirements for this repo.

---

## Accessibility Requirements

The project-specific mobile sidebar must:

- use semantic buttons for non-navigation actions
- use links for route navigation
- provide accessible labels for menu controls
- support keyboard interaction
- support screen readers
- keep touch targets large enough for mobile use
- avoid relying on color alone for active state

---

## Performance Requirements

The component should:

- avoid rebuilding filtered trees unnecessarily
- handle nested route trees without visible lag
- keep route-derived calculations memoizable

This matters here because `company.booking` and `company.timesheet` already contain multiple nested levels and hidden descendants.

---

## Out Of Scope For The First Implementation

Do not include these in the first pass:

- animation polish
- swipe gestures
- persisted drawer state across reloads
- persisted page state across reloads
- permission-system refactors
- route-tree schema changes
- public booking nav redesign
