import { redirect, type MiddlewareFunction } from 'react-router';
import { AuthController, type AuthPermissionFlagsDto } from '~/api/generated';
import { authService } from '~/lib/auth-service';
import { redirectWithError } from '~/lib/flash-message.server';
import { ROUTES_MAP } from '~/lib/routing/route-tree';

/**
 * Lets only an admin of the active company that has the product through. Listed in a layout's `middleware`, it runs
 * once per request before every loader and action below that layout, so those don't check again. Signed out goes to
 * sign-in; anything else, including permissions that can't be loaded, goes to `deniedHref` with `deniedMessage`.
 * The sidebar only hides the links and the backend enforces it too.
 */
function requireCompanyAdmin(
  product: keyof AuthPermissionFlagsDto,
  deniedHref: () => string,
  deniedMessage: string,
): MiddlewareFunction<Response> {
  return async ({ request }, next) => {
    let session: Awaited<ReturnType<typeof authService.getUserSession>>;
    try {
      session = await authService.getUserSession(request);
    } catch {
      throw redirect(ROUTES_MAP['auth.sign-in'].href);
    }

    let allowed = false;
    try {
      const response = await AuthController.getPermissions();
      const permissions = response.data?.data;
      allowed = Boolean(
        session.user.companyId &&
          permissions?.companyId === session.user.companyId &&
          permissions?.flags?.[product] &&
          permissions.companyRoles?.includes('ADMIN'),
      );
    } catch {
      allowed = false;
    }

    if (!allowed) {
      throw await redirectWithError(request, deniedHref(), deniedMessage);
    }
    return next();
  };
}

/** Booking admin pages and their API routes (`/company/booking/admin/…`, `/api/company/booking/admin/…`). */
export const requireBookingAdmin = requireCompanyAdmin(
  'canAccessBooking',
  () => ROUTES_MAP['company.booking'].href,
  'Du må være administrator i dette selskapet for å administrere booking.',
);

/** Every marketing page (list, create, detail). */
export const requireMarketingAdmin = requireCompanyAdmin(
  'canAccessMarketing',
  () => ROUTES_MAP['company'].href,
  'Du må være administrator i et selskap med markedsføring for å bruke denne siden.',
);
