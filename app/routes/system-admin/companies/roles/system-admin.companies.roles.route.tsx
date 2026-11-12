import { data, NavLink } from 'react-router';
import type { Route } from './+types/system-admin.companies.roles.route';
import { Base } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { setFlashMessage } from '~/lib/flash-message.server';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { Button, CompanyPageTemplate, FormField, Label, Notice, Panel, PageNotice } from '~/ui';
import { SystemAdminCompanySelect } from '../_components/system-admin-company-select';
import { parsePositiveInteger } from '../_utils/system-admin-company-display';
import { loadSystemAdminCompanyOptions } from '../_utils/system-admin-companies.server';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const selectedCompanyId = parsePositiveInteger(url.searchParams.get('companyId')) ?? '';

  try {
    return data({
      companies: await loadSystemAdminCompanyOptions(request),
      selectedCompanyId,
      loadError: null as string | null,
    });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke hente selskaper.');
    return data(
      {
        companies: [],
        selectedCompanyId,
        loadError: message,
      },
      { status: status ?? 400 },
    );
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const userId = Number(formData.get('userId'));
  const companyId = Number(formData.get('companyId'));
  const role = String(formData.get('role') ?? 'ADMIN');

  if (!Number.isInteger(userId) || userId < 1 || !Number.isInteger(companyId) || companyId < 1) {
    const message = 'Ugyldig bruker- eller selskap-ID.';
    const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
    return data(
      { error: message, values: { userId: '', companyId: '', role } },
      { status: 400, headers: { 'Set-Cookie': flashCookie } },
    );
  }

  try {
    await withAuth(request, async () =>
      Base.addCompanyRole({
        body: {
          userId,
          companyRoles: [{ companyId, roles: [role as 'ADMIN' | 'EMPLOYEE'] }],
        },
      }),
    );

    const flashCookie = await setFlashMessage(request, { type: 'success', text: 'Rolle tildelt.' });
    return data(
      { error: null, values: { userId: '', companyId: '', role: 'ADMIN' } },
      { headers: { 'Set-Cookie': flashCookie } },
    );
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke tildele rolle.');
    const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
    return data(
      { error: message, values: { userId: String(userId), companyId: String(companyId), role } },
      { status: status ?? 400, headers: { 'Set-Cookie': flashCookie } },
    );
  }
}

export default function SystemAdminCompaniesRolesPage({ loaderData, actionData }: Route.ComponentProps) {
  const values = actionData?.values ?? { userId: '', companyId: loaderData.selectedCompanyId, role: 'ADMIN' };

  return (
    <CompanyPageTemplate
      title="Tildel selskapsroller"
      description="Koble bruker til selskap med ADMIN eller EMPLOYEE."
      routeLinks={
        <Button asChild variant="outline">
          <NavLink to={ROUTES_MAP['system-admin.companies'].href}>Tilbake til selskaper</NavLink>
        </Button>
      }
    >
      {actionData?.error ? (
        <Notice tone="emphasis" title="Kunne ikke tildele rolle" message={actionData.error} />
      ) : null}
      {loaderData.loadError ? <PageNotice title="Kunne ikke hente selskaper" /> : null}
      <Panel title="Rolle" description="Velg bruker, selskap og rolle som skal tildeles.">
        <form method="post" className="space-y-4">
          <FormField label="Bruker-ID" name="userId" type="number" defaultValue={values.userId} required />
          <SystemAdminCompanySelect companies={loaderData.companies} defaultValue={values.companyId} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="role">Rolle</Label>
            <select
              id="role"
              name="role"
              defaultValue={values.role}
              className="min-h-11 w-full rounded-[var(--radius-field)] border border-border bg-background px-3 py-2 text-sm text-text-primary focus-visible:border-interactive focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-blue-50 sm:h-10 sm:min-h-10 sm:py-0"
            >
              <option value="ADMIN">ADMIN</option>
              <option value="EMPLOYEE">EMPLOYEE</option>
            </select>
          </div>
          <Button type="submit">Tildel rolle</Button>
        </form>
      </Panel>
    </CompanyPageTemplate>
  );
}
