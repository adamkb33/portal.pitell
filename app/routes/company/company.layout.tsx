import { Outlet, redirect, useOutletContext } from 'react-router';
import { CompanyBackground } from '~/components/layout/page-backgrounds';
import { getAuthPayloadFromRequest } from '~/lib/auth.utils';
import type { RootOutletContext } from '../root.layout';
import type { Route } from './+types/company.route';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { redirectWithInfo } from '~/lib/flash-message.server';
import { redirectWithError } from '~/lib/flash-message.server';
import type { ApiMessage } from '~/api/generated';

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const auth = await getAuthPayloadFromRequest(request);

    if (!auth) {
      return redirect('/');
    }

    if (!auth?.companyId) {
      return redirect(ROUTES_MAP['user.company-context'].href);
    }

    return null;
  } catch (error) {
    const apiMessage = (error as { response?: { data?: { message?: ApiMessage } } })?.response?.data?.message;
    if (apiMessage?.id === 'COMPANY_CONTEXT_REQUIRED') {
      return redirectWithInfo(request, ROUTES_MAP['user.company-context'].href, apiMessage);
    }

    return redirectWithError(request, '/', 'Kunne ikke laste selskapssiden. Prøv igjen.');
  }
}

export default function CompanyLayout() {
  const context = useOutletContext<RootOutletContext>();

  return (
    <div className="flex min-h-full flex-col">
      <CompanyBackground />
      <main className="flex-1">
        <Outlet context={context} />
      </main>
    </div>
  );
}
