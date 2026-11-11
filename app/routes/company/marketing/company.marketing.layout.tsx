import { Outlet, redirect, type ShouldRevalidateFunctionArgs } from 'react-router';
import type { Route } from './+types/company.marketing.layout';
import { AuthController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { authService } from '~/lib/auth-service';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { redirectWithError } from '~/lib/flash-message.server';

// Every marketing page (list, create, detail) needs MARKETING and ADMIN in the active company.
// The sidebar only hides the link; this guard stops direct visits. The backend enforces it too.
// Child loaders run in parallel with this one and actions skip it, so each child loader and action
// must also call it: `import { loader as requireMarketingAdmin } from '../company.marketing.layout'`.
export async function loader({ request }: Pick<Route.LoaderArgs, 'request'>) {
  let session: Awaited<ReturnType<typeof authService.getUserSession>>;
  try {
    session = await authService.getUserSession(request);
  } catch {
    throw redirect(ROUTES_MAP['auth.sign-in'].href);
  }

  let canUseMarketing = false;
  try {
    const response = await withAuth(request, () => AuthController.getPermissions(), session.accessToken);
    const permissions = response.data?.data;
    canUseMarketing = Boolean(
      session.user.companyId &&
        permissions?.companyId === session.user.companyId &&
        permissions?.flags?.canAccessMarketing &&
        permissions.companyRoles?.includes('ADMIN'),
    );
  } catch {
    canUseMarketing = false;
  }

  if (!canUseMarketing) {
    throw await redirectWithError(
      request,
      ROUTES_MAP['company'].href,
      'Du må være administrator i et selskap med markedsføring for å bruke denne siden.',
    );
  }
  return null;
}

// Re-check on every navigation and form submission, so losing the product or the role takes effect at once.
// The new-campaign live preview is the exception: it posts after every pause in typing, and its action checks
// access itself.
export function shouldRevalidate({ formData }: Pick<ShouldRevalidateFunctionArgs, 'formData'>) {
  return formData?.get('intent') !== 'preview';
}

export default function CompanyMarketingLayout() {
  return <Outlet />;
}
