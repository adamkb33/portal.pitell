# Role-Based UI Refactor Plan

## Goal

Refactor the current role-based UI into a production-grade authorization model for a multi-tenant application where:

- access is evaluated against the **active company context**
- navigation visibility, route entry, and server-side actions use the **same policy model**
- roles, permissions, and product entitlements are **explicit**
- route metadata is easier to maintain and safer to evolve

This plan is tailored to the current implementation in:

- `/Users/adambaser/Documents/portal.baser-it/app/lib/route-tree.ts`
- `/Users/adambaser/Documents/portal.baser-it/app/lib/routes-builder.ts`
- `/Users/adambaser/Documents/portal.baser-it/app/routes/_features/root.loader.ts`
- `/Users/adambaser/Documents/portal.baser-it/app/routes/root.layout.tsx`
- `/Users/adambaser/Documents/portal.baser-it/app/api/utils/with-auth.ts`

## Current State Summary

The current design has a good core idea:

- one declarative route tree
- route generation and visible navigation both come from that tree
- company roles and product access are already modeled in a basic way

The main issues are:

1. Navigation is evaluated across **all companies** in `UserContextDto`, not the active company.
2. The route tree acts as both route structure and authorization policy, which makes growth harder.
3. Product access is inferred from route id segments like `booking` and `timesheet`.
4. Frontend visibility and backend enforcement are not driven by one shared permission layer.
5. There is no explicit permission vocabulary such as `booking.profile.read` or `company.users.manage`.
6. Hidden and dynamic routes work for routing, but route-local metadata and breadcrumb support are limited.

## Target Outcome

The refactor should produce this behavior:

1. A user selects an active company.
2. The app builds an authorization snapshot for that active company only.
3. Navigation uses that snapshot.
4. Route loaders and actions use that same snapshot.
5. API routes and server-side service calls use that same snapshot.
6. Product entitlements and roles are separate concepts.
7. Permissions are explicit and stable.

## Target Authorization Model

### Core Concepts

Use four distinct concepts:

- `User`
- `ActiveCompanyContext`
- `Entitlements`
- `Permissions`

### Recommended Types

```ts
export type CompanyRole = 'ADMIN' | 'EMPLOYEE';

export type ProductEntitlement = 'BOOKING' | 'TIMESHEET' | 'EVENT';

export type Permission =
  | 'company.dashboard.read'
  | 'company.settings.read'
  | 'company.settings.manage'
  | 'company.users.read'
  | 'company.users.manage'
  | 'company.contacts.read'
  | 'company.contacts.manage'
  | 'notifications.read'
  | 'booking.dashboard.read'
  | 'booking.profile.read'
  | 'booking.profile.manage'
  | 'booking.service-groups.read'
  | 'booking.service-groups.manage'
  | 'booking.appointments.read'
  | 'booking.appointments.manage'
  | 'timesheet.read'
  | 'timesheet.register'
  | 'timesheet.submissions.read'
  | 'timesheet.submissions.manage';

export type ActiveCompanyAccess = {
  companyId: number;
  roles: CompanyRole[];
  entitlements: ProductEntitlement[];
  permissions: Permission[];
};

export type AuthorizationSnapshot = {
  isAuthenticated: boolean;
  activeCompanyId?: number;
  activeCompany?: ActiveCompanyAccess | null;
};
```

### Why This Is Better

- roles stay human-readable
- permissions stay stable even if route names change
- entitlements remain separate from job function
- route policies become declarative and testable

## Proposed Architecture

### 1. Introduce an Authorization Layer

Create a dedicated module for authorization decisions.

Suggested files:

- `/Users/adambaser/Documents/portal.baser-it/app/lib/authorization/authorization.types.ts`
- `/Users/adambaser/Documents/portal.baser-it/app/lib/authorization/authorization.service.ts`
- `/Users/adambaser/Documents/portal.baser-it/app/lib/authorization/authorization.server.ts`
- `/Users/adambaser/Documents/portal.baser-it/app/lib/authorization/authorization.test.ts`

Suggested API:

```ts
export type AccessRequirement = {
  authenticated?: boolean;
  companyContextRequired?: boolean;
  requiredPermissions?: Permission[];
  requiredEntitlements?: ProductEntitlement[];
};

export function canAccess(snapshot: AuthorizationSnapshot, requirement?: AccessRequirement): boolean;

export function requireAccess(snapshot: AuthorizationSnapshot, requirement?: AccessRequirement): void;
```

### 2. Stop Deriving Product Access From Route IDs

Current logic infers product access from route id text. Replace that with explicit metadata.

Instead of:

```ts
id: 'company.booking.profile'
```

and later inferring `BOOKING`, use:

```ts
requiredEntitlements: ['BOOKING']
```

### 3. Refactor Route Metadata

Keep the route tree if you want a centralized registry, but change it from a role-centric model to a requirement-centric model.

Suggested route metadata:

```ts
export type AppRouteNode = {
  id: string;
  href: string;
  label?: string;
  placement?: 'NAVIGATION' | 'SIDEBAR' | 'FOOTER';
  category?: 'PUBLIC' | 'AUTH' | 'USER' | 'COMPANY' | 'NONE';
  hidden?: boolean;
  excludeLayout?: boolean;
  iconName?: IconName;
  access?: AccessRequirement;
  children?: AppRouteNode[];
};
```

Example:

```ts
{
  id: 'company.booking.admin.service-groups',
  href: '/company/booking/admin/service-groups',
  label: 'Tjenestegrupper',
  placement: 'SIDEBAR',
  category: 'COMPANY',
  iconName: 'FolderKanban',
  access: {
    authenticated: true,
    companyContextRequired: true,
    requiredEntitlements: ['BOOKING'],
    requiredPermissions: ['booking.service-groups.read'],
  },
}
```

### 4. Drive Navigation From Active Company Access Only

The root loader should build:

- `user`
- `companyContext`
- `authorizationSnapshot`
- `userNavigation`

The authorization snapshot must only reflect the active company in the token, not all memberships combined for authorization decisions.

Suggested flow:

```ts
const userContext = await AuthController.getUserContext();
const authPayload = authService.verifyAndDecodeToken(accessToken);

const activeCompanyMembership = userContext.companies.find(
  (entry) => entry.company.id === authPayload.companyId,
);

const authorizationSnapshot = buildAuthorizationSnapshot({
  userContext,
  activeCompanyMembership,
});

const navigation = createNavigation(authorizationSnapshot);
```

## Recommended Permission Mapping

### Role to Permission Mapping

Create one explicit mapping.

```ts
const ROLE_PERMISSION_MAP: Record<CompanyRole, Permission[]> = {
  ADMIN: [
    'company.dashboard.read',
    'company.settings.read',
    'company.settings.manage',
    'company.users.read',
    'company.users.manage',
    'company.contacts.read',
    'company.contacts.manage',
    'notifications.read',
    'booking.dashboard.read',
    'booking.profile.read',
    'booking.profile.manage',
    'booking.service-groups.read',
    'booking.service-groups.manage',
    'booking.appointments.read',
    'booking.appointments.manage',
    'timesheet.read',
    'timesheet.register',
    'timesheet.submissions.read',
    'timesheet.submissions.manage',
  ],
  EMPLOYEE: [
    'company.dashboard.read',
    'company.contacts.read',
    'notifications.read',
    'booking.dashboard.read',
    'booking.profile.read',
    'booking.profile.manage',
    'booking.appointments.read',
    'booking.appointments.manage',
    'timesheet.read',
    'timesheet.register',
  ],
};
```

This can be tightened later if employee booking or timesheet access should be narrower.

### Entitlement Gating

Permissions should not be enough by themselves.

Examples:

- `booking.profile.manage` only matters if `BOOKING` is enabled
- `timesheet.register` only matters if `TIMESHEET` is enabled

That means the final check becomes:

```ts
canAccess(snapshot, {
  authenticated: true,
  companyContextRequired: true,
  requiredEntitlements: ['BOOKING'],
  requiredPermissions: ['booking.profile.manage'],
});
```

## Concrete Refactor Plan

### Phase 1: Stabilize the Model Without Large Routing Changes

#### Objective

Keep the current route tree and routing approach, but replace the access logic under it.

#### Tasks

1. Add authorization types and a `canAccess()` helper.
2. Build `AuthorizationSnapshot` in the root loader.
3. Refactor `createNavigation()` to accept `AuthorizationSnapshot` instead of full `UserContextDto`.
4. Replace:
   - `companyRoles`
   - `accessType: PRODUCT`
   - route-id-based product inference
   with explicit `access.requiredPermissions` and `access.requiredEntitlements`.
5. Keep `hidden`, `placement`, `category`, and `iconName` as-is.

#### Example

Before:

```ts
{
  id: 'company.timesheet.admin.submissions',
  href: '/company/timesheets/admin/submissions',
  label: 'Innsendinger',
  accessType: Access.PRODUCT,
  companyRoles: [CompanyRole.ADMIN],
}
```

After:

```ts
{
  id: 'company.timesheet.admin.submissions',
  href: '/company/timesheets/admin/submissions',
  label: 'Innsendinger',
  access: {
    authenticated: true,
    companyContextRequired: true,
    requiredEntitlements: ['TIMESHEET'],
    requiredPermissions: ['timesheet.submissions.read'],
  },
}
```

### Phase 2: Enforce Route Entry Consistently

#### Objective

Apply the same access requirements in loaders and actions.

#### Tasks

1. Create a helper:

```ts
export async function requireRouteAccess(
  request: Request,
  requirement: AccessRequirement,
): Promise<AuthorizationSnapshot> {
  const snapshot = await buildAuthorizationSnapshotFromRequest(request);

  if (!canAccess(snapshot, requirement)) {
    throw redirect('/');
  }

  return snapshot;
}
```

2. Use it in company feature routes.
3. Use it in API route handlers where the policy is known at the route boundary.

#### Example

```ts
export async function loader({ request }: Route.LoaderArgs) {
  await requireRouteAccess(request, {
    authenticated: true,
    companyContextRequired: true,
    requiredEntitlements: ['BOOKING'],
    requiredPermissions: ['booking.service-groups.read'],
  });

  return withAuth(request, async () => {
    return CompanyUserServiceGroupController.getServiceGroups();
  });
}
```

### Phase 3: Separate Structural Routing From Policy Metadata

#### Objective

Reduce the amount of business policy stored in one monolithic route tree.

#### Recommended Direction

Use centralized route ids plus route-local metadata.

Two viable options:

1. Keep a central route registry for ids and hrefs, but let route modules export policy.
2. Move more metadata into React Router route modules using `handle`.

Example route-local metadata:

```ts
export const handle = {
  breadcrumb: 'Tjenestegrupper',
  access: {
    authenticated: true,
    companyContextRequired: true,
    requiredEntitlements: ['BOOKING'],
    requiredPermissions: ['booking.service-groups.read'],
  },
};
```

This is especially useful for:

- breadcrumbs
- dynamic routes
- feature ownership
- reducing merge conflicts in one giant file

### Phase 4: Improve Dynamic Route Metadata and Breadcrumbs

#### Objective

Fix exact-path-only breadcrumb logic and support dynamic route labels.

Current breadcrumb generation only matches `item.href === currentPath`, which does not scale well for routes like `/company/notifications/:id`.

Recommended approach:

- use route-local `handle.breadcrumb`
- derive breadcrumb trail from `useMatches()`
- allow breadcrumb to be static text or a function of loader data

Example:

```ts
export const handle = {
  breadcrumb: ({ data }: { data: Route.ComponentProps['loaderData'] }) =>
    data.notification?.title ?? 'Varsel',
};
```

### Phase 5: Expand Beyond Coarse Roles

#### Objective

Prepare for growth without rewriting again.

Possible future needs:

- custom company roles
- resource-specific permissions
- delegated admin
- read-only admin
- approval workflows
- audit requirements

To support this, keep routes permission-based from the start.

## Recommended File Changes

### New Files

- `/Users/adambaser/Documents/portal.baser-it/app/lib/authorization/authorization.types.ts`
- `/Users/adambaser/Documents/portal.baser-it/app/lib/authorization/authorization.constants.ts`
- `/Users/adambaser/Documents/portal.baser-it/app/lib/authorization/authorization.service.ts`
- `/Users/adambaser/Documents/portal.baser-it/app/lib/authorization/authorization.server.ts`
- `/Users/adambaser/Documents/portal.baser-it/app/lib/authorization/create-navigation.ts`
- `/Users/adambaser/Documents/portal.baser-it/app/lib/authorization/authorization.test.ts`

### Existing Files To Refactor

- `/Users/adambaser/Documents/portal.baser-it/app/lib/route-tree.ts`
- `/Users/adambaser/Documents/portal.baser-it/app/routes/_features/root.loader.ts`
- `/Users/adambaser/Documents/portal.baser-it/app/routes/root.layout.tsx`
- `/Users/adambaser/Documents/portal.baser-it/app/components/layout/navbar.tsx`
- `/Users/adambaser/Documents/portal.baser-it/app/components/layout/sidebar-breadcrums.tsx`
- `/Users/adambaser/Documents/portal.baser-it/app/routes/company/company.layout.tsx`
- company feature loaders and actions
- API route handlers that need policy guards

## Example Refactor of the Current Route Tree

### Before

```ts
{
  id: 'company.booking.profile',
  href: '/company/booking/profile',
  label: 'Min booking profil',
  category: BrachCategory.COMPANY,
  accessType: Access.PRODUCT,
  companyRoles: [CompanyRole.ADMIN, CompanyRole.EMPLOYEE],
  iconName: 'UserCircle',
}
```

### After

```ts
{
  id: 'company.booking.profile',
  href: '/company/booking/profile',
  label: 'Min bookingprofil',
  category: 'COMPANY',
  placement: 'SIDEBAR',
  iconName: 'UserCircle',
  access: {
    authenticated: true,
    companyContextRequired: true,
    requiredEntitlements: ['BOOKING'],
    requiredPermissions: ['booking.profile.read'],
  },
}
```

### Hidden Child Example

```ts
{
  id: 'company.booking.appointments.create.new-user',
  href: '/company/booking/appointments/create/new-user',
  hidden: true,
  access: {
    authenticated: true,
    companyContextRequired: true,
    requiredEntitlements: ['BOOKING'],
    requiredPermissions: ['booking.appointments.manage'],
  },
}
```

## Navigation Refactor Example

### Before

Current navigation logic is tightly coupled to `UserContextDto`.

### After

```ts
export function createNavigation(
  routeTree: AppRouteNode[],
  snapshot: AuthorizationSnapshot,
): UserNavigation {
  const visibleTree = routeTree.flatMap((node) => filterVisibleNode(node, snapshot));
  return collectByPlacement(visibleTree);
}

function filterVisibleNode(
  node: AppRouteNode,
  snapshot: AuthorizationSnapshot,
): AppRouteNode[] {
  if (!canAccess(snapshot, node.access)) {
    return [];
  }

  const children = node.children?.flatMap((child) => filterVisibleNode(child, snapshot)) ?? [];

  if (node.hidden) {
    return children;
  }

  return [
    {
      ...node,
      children: children.length > 0 ? children : undefined,
    },
  ];
}
```

## Route Entry and API Enforcement

### Principle

The frontend may hide links, but that is not authorization.

Every sensitive route or API endpoint should be protected by:

1. authentication check
2. active company context check
3. entitlement check
4. permission check

### Recommended Pattern

```ts
export async function action({ request }: Route.ActionArgs) {
  await requireRouteAccess(request, {
    authenticated: true,
    companyContextRequired: true,
    requiredEntitlements: ['TIMESHEET'],
    requiredPermissions: ['timesheet.register'],
  });

  return withAuth(request, async () => {
    // existing action logic
  });
}
```

## Testing Strategy

### Unit Tests

Add test coverage for:

- `buildAuthorizationSnapshot()`
- `canAccess()`
- navigation filtering
- role-to-permission mapping
- entitlement gating

Example test cases:

```ts
it('denies booking routes when BOOKING entitlement is missing', () => {});
it('denies admin routes for EMPLOYEE in active company', () => {});
it('allows employee booking profile access when BOOKING is enabled', () => {});
it('does not grant current-company access from another company membership', () => {});
```

### Integration Tests

Add route-level tests for:

- direct navigation to admin-only pages
- direct navigation to booking routes without booking entitlement
- selected company switch changing visible navigation
- hidden route access with valid permission
- hidden route access denied without valid permission

### Regression Tests

Keep or expand tests around:

- route tree registration
- route map generation
- route to file mapping

## Migration Strategy

### Stage 1

Introduce the new authorization layer without changing page behavior.

- add new types
- add permission mapping
- build active-company snapshot
- write tests

### Stage 2

Switch navigation to use active-company authorization.

- keep route tree mostly intact
- replace current access checks under the hood

### Stage 3

Adopt permission requirements on key routes first.

Priority order:

1. company admin
2. booking admin
3. timesheet admin
4. contact management
5. employee management

### Stage 4

Refactor breadcrumbs and dynamic route metadata.

### Stage 5

Optionally externalize policy if the domain grows significantly.

Candidates if needed later:

- OpenFGA
- Oso
- Cerbos
- Amazon Verified Permissions

This should only happen after the local permission vocabulary is stable.

## Risks and Mitigations

### Risk: Too Much Change at Once

Mitigation:

- keep the route tree initially
- replace the policy logic first
- avoid routing rewrites in the first pass

### Risk: Permission Explosion

Mitigation:

- start with a moderate permission set
- group by feature and action
- avoid per-button permissions unless there is a real business need

### Risk: Drift Between Frontend and Backend

Mitigation:

- define one permission vocabulary
- document it centrally
- use the same permission names in both frontend and backend where possible

### Risk: Current Company Confusion

Mitigation:

- treat active company membership as the only source for route visibility
- keep cross-company membership data only for switching context

## Definition of Done

This refactor is complete when:

1. Navigation is built only from the active company context.
2. Product access is explicit and not inferred from route ids.
3. Permissions are explicit and route requirements use them.
4. Sensitive loaders and actions use shared authorization checks.
5. Breadcrumbs support dynamic routes cleanly.
6. There are tests proving active-company isolation.
7. There are tests proving role and entitlement enforcement.

## Recommended First Implementation Slice

The safest high-value first slice is:

1. add `AuthorizationSnapshot`
2. add `Permission` vocabulary
3. add role-to-permission mapping
4. refactor `createNavigation()` to use active company only
5. convert booking admin and timesheet admin routes to explicit `requiredPermissions`
6. add unit tests for cross-company access leakage

That slice addresses the biggest production issue without forcing a full route-system rewrite.

## Example End State

At the end of the refactor, a request to a company route should read like this:

```ts
export async function loader({ request }: Route.LoaderArgs) {
  await requireRouteAccess(request, {
    authenticated: true,
    companyContextRequired: true,
    requiredEntitlements: ['BOOKING'],
    requiredPermissions: ['booking.appointments.read'],
  });

  return withAuth(request, async () => {
    return CompanyUserAppointmentController.getAppointments();
  });
}
```

And a route definition should read like this:

```ts
{
  id: 'company.booking.appointments',
  href: '/company/booking/appointments',
  label: 'Timebestillinger',
  placement: 'SIDEBAR',
  category: 'COMPANY',
  iconName: 'ClipboardList',
  access: {
    authenticated: true,
    companyContextRequired: true,
    requiredEntitlements: ['BOOKING'],
    requiredPermissions: ['booking.appointments.read'],
  },
}
```

That is a much stronger foundation for a production-grade role-based UI than the current model.
