import { API_ROUTES_TREE } from './api/api.routes';
import { AUTH_ROUTES } from './auth/auth.routes';
import { BOOKING_ROUTES } from './booking/booking.routes';
import { COMPANY_ROUTES } from './company/company.routes';
import { MARKETING_ROUTES } from './marketing/marketing.routes';
import { OFFER_ROUTES } from './offer/offer.routes';
import { SYSTEM_ADMIN_ROUTES } from './system-admin/system-admin.routes';
import { USER_ROUTES } from './user/user.routes';
import type { UserContextDto } from '~/api/generated';
import { buildApiRoutesMap, buildRoutesMap, createNavigationForTree, type UserNavigation } from './route-utils';
import type { ApiRoute, RouteBranch } from './route-types';

export {
  Access,
  BrachCategory,
  CompanyRole,
  RoutePlaceMent,
  UserRole,
  type ApiRoute,
  type RouteBranch,
} from './route-types';
export type { UserNavigation } from './route-utils';

export const ROUTE_TREE: RouteBranch[] = [
  ...AUTH_ROUTES,
  ...USER_ROUTES,
  ...SYSTEM_ADMIN_ROUTES,
  ...COMPANY_ROUTES,
  ...BOOKING_ROUTES,
  ...OFFER_ROUTES,
  ...MARKETING_ROUTES,
];

export { API_ROUTES_TREE };

export const API_ROUTES_MAP: Record<string, { id: string; url: string }> = buildApiRoutesMap(API_ROUTES_TREE);
export const ROUTES_MAP: Record<string, { id: string; href: string }> = buildRoutesMap(ROUTE_TREE);

export const createNavigation = (
  userContext?: UserContextDto | null,
  userRoles: string[] = [],
  isAuthenticatedOverride = false,
): UserNavigation => createNavigationForTree(ROUTE_TREE, userContext, userRoles, isAuthenticatedOverride);
