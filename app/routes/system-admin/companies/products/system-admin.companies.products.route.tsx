import { data, NavLink } from 'react-router';
import type { Route } from './+types/system-admin.companies.products.route';
import { Base } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { setFlashMessage } from '~/lib/flash-message.server';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { Button, Checkbox, CompanyPageTemplate, Notice, Panel } from '~/ui';
import { SystemAdminCompanySelect } from '../_components/system-admin-company-select';
import { parsePositiveInteger } from '../_utils/system-admin-company-display';
import { loadSystemAdminCompanyOptions } from '../_utils/system-admin-companies.server';

const PRODUCT_VALUES = ['BOOKING', 'EVENT', 'OFFER', 'MARKETING', 'TIMESHEET'] as const;

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
  const companyId = Number(formData.get('companyId'));
  const products = PRODUCT_VALUES.filter((product) => formData.get(product) === 'on');

  if (!Number.isInteger(companyId) || companyId < 1 || products.length === 0) {
    const message = 'Selskap-ID og minst ett produkt er påkrevd.';
    const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
    return data(
      { error: message, values: { companyId: '', products } },
      { status: 400, headers: { 'Set-Cookie': flashCookie } },
    );
  }

  try {
    await withAuth(request, async () =>
      Base.addProductsToCompany({
        body: {
          companyId,
          products: [...products],
        },
      }),
    );

    const flashCookie = await setFlashMessage(request, { type: 'success', text: 'Produkter oppdatert.' });
    return data({ error: null, values: { companyId: '', products: [] } }, { headers: { 'Set-Cookie': flashCookie } });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke oppdatere produkter.');
    const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
    return data(
      { error: message, values: { companyId: String(companyId), products } },
      { status: status ?? 400, headers: { 'Set-Cookie': flashCookie } },
    );
  }
}

export default function SystemAdminCompaniesProductsPage({ loaderData, actionData }: Route.ComponentProps) {
  const values = actionData?.values ?? { companyId: loaderData.selectedCompanyId, products: [] as string[] };

  return (
    <CompanyPageTemplate
      title="Tildel produkter"
      description="Aktiver produkter for selskap via system-admin endpoint."
      routeLinks={
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <NavLink to={ROUTES_MAP['system-admin.companies'].href}>Tilbake til selskaper</NavLink>
          </Button>
          <Button asChild variant="outline">
            <NavLink to={ROUTES_MAP['system-admin.companies.products.delete'].href}>Fjern produkter</NavLink>
          </Button>
        </div>
      }
    >
      {actionData?.error ? (
        <Notice tone="emphasis" title="Kunne ikke oppdatere produkter" message={actionData.error} />
      ) : null}
      {loaderData.loadError ? (
        <Notice tone="emphasis" title="Kunne ikke hente selskaper" message={loaderData.loadError} />
      ) : null}
      <Panel title="Produkter" description="Velg produktene som skal aktiveres for selskapet.">
        <form method="post" className="space-y-4">
          <SystemAdminCompanySelect companies={loaderData.companies} defaultValue={values.companyId} />
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-text-primary">Produkter</legend>
            {PRODUCT_VALUES.map((product) => (
              <label key={product} className="flex min-h-10 items-center gap-2 text-sm text-text-primary">
                <Checkbox name={product} defaultChecked={values.products.includes(product)} />
                {product}
              </label>
            ))}
          </fieldset>
          <Button type="submit">Oppdater produkter</Button>
        </form>
      </Panel>
    </CompanyPageTemplate>
  );
}
