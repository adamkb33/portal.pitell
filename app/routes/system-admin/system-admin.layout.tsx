import { Outlet, redirect } from 'react-router';
import { AuthController } from '~/api/generated';
import { authService } from '~/lib/auth-service';
import { redirectWithError } from '~/lib/flash-message.server';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { UserRole } from '~/lib/routing/route-types';
import type { Route } from './+types/system-admin.layout';

export async function loader({ request }: Route.LoaderArgs) {
  try {
    await authService.getUserSession(request);
  } catch {
    throw redirect(ROUTES_MAP['auth.sign-in'].href);
  }

  let hasSystemAdminRole = false;
  try {
    const permissionsResponse = await AuthController.getPermissions();
    const permissions = permissionsResponse.data?.data;
    hasSystemAdminRole =
      Boolean(permissions?.flags?.canAccessSystemAdmin) &&
      Boolean(permissions?.systemRoles?.includes(UserRole.SYSTEM_ADMIN));
  } catch {
    hasSystemAdminRole = false;
  }

  if (!hasSystemAdminRole) {
    throw await redirectWithError(request, ROUTES_MAP['company'].href, 'Du har ikke tilgang til systemadministrasjon.');
  }

  return null;
}

export default function SystemAdminLayout() {
  return <Outlet />;
}
