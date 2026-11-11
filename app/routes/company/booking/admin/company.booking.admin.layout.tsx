import { Outlet, redirect } from 'react-router';
import type { Route } from './+types/company.booking.admin.layout';
import { AuthController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { authService } from '~/lib/auth-service';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { redirectWithError } from '~/lib/flash-message.server';

export async function loader({ request }: Pick<Route.LoaderArgs, 'request'>) {
  let session: Awaited<ReturnType<typeof authService.getUserSession>>;
  try {
    session = await authService.getUserSession(request);
  } catch {
    throw redirect(ROUTES_MAP['auth.sign-in'].href);
  }

  let canAdminister = false;
  try {
    const response = await withAuth(request, () => AuthController.getPermissions(), session.accessToken);
    const permissions = response.data?.data;
    canAdminister = Boolean(
      session.user.companyId &&
        permissions?.companyId === session.user.companyId &&
        permissions?.flags?.canAccessBooking &&
        permissions.companyRoles?.includes('ADMIN'),
    );
  } catch {
    canAdminister = false;
  }

  if (!canAdminister) {
    throw await redirectWithError(
      request,
      ROUTES_MAP['company.booking'].href,
      'Du må være administrator i dette selskapet for å administrere booking.',
    );
  }
  return null;
}

export function shouldRevalidate() {
  return true;
}

export default function CompanyBookingAdminLayout() {
  return <Outlet />;
}
