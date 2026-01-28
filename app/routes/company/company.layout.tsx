import { Outlet, redirect, useOutletContext } from 'react-router';
import { SidebarBreadcrumbs } from '~/components/layout/sidebar-breadcrums';
import { getAuthPayloadFromRequest } from '~/lib/auth.utils';
import type { RootOutletContext } from '../root.layout';
import type { Route } from './+types/company.route';
import { ROUTES_MAP } from '~/lib/route-tree';
import { redirectWithInfo } from '~/routes/company/_lib/flash-message.server';
import type { ApiMessage } from '~/api/generated/identity';

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

    return null;
  }
}

export default function CompanyLayout() {
  const context = useOutletContext<RootOutletContext>();

  return (
    <div className="flex flex-col bg-primary/10">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 md:px-6 md:py-4">
          <SidebarBreadcrumbs items={context.userNav?.SIDEBAR} />
        </div>
      </header>

      <main className="flex-1 container mx-auto p-2 md:px-6 md:py-6 lg:py-8">
        <Outlet context={context} />
      </main>
    </div>
  );
}
