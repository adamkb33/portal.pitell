import { data, NavLink } from 'react-router';
import type { Route } from './+types/system-admin.companies.create.route';
import { Base } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { setFlashMessage } from '~/lib/flash-message.server';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { Button, CompanyPageTemplate, FormField, Notice, Panel, Text } from '~/ui';

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const orgNumber = String(formData.get('orgNumber') ?? '').trim();
  const googlePlaceId = String(formData.get('googlePlaceId') ?? '').trim();

  if (!orgNumber || !googlePlaceId) {
    const message = 'Organisasjonsnummer og Google Place ID er påkrevd.';
    const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
    return data(
      { error: message, values: { orgNumber, googlePlaceId }, company: null },
      { status: 400, headers: { 'Set-Cookie': flashCookie } },
    );
  }

  try {
    const response = await withAuth(request, async () => Base.createCompany({ body: { orgNumber, googlePlaceId } }));
    const flashCookie = await setFlashMessage(request, { type: 'success', text: 'Selskap opprettet.' });
    return data(
      { error: null, values: { orgNumber: '', googlePlaceId: '' }, company: response.data?.data ?? null },
      { headers: { 'Set-Cookie': flashCookie } },
    );
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke opprette selskap.');
    const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
    return data(
      { error: message, values: { orgNumber, googlePlaceId }, company: null },
      { status: status ?? 400, headers: { 'Set-Cookie': flashCookie } },
    );
  }
}

export default function SystemAdminCompaniesCreatePage({ actionData }: Route.ComponentProps) {
  const values = actionData?.values ?? { orgNumber: '', googlePlaceId: '' };

  return (
    <CompanyPageTemplate
      title="Opprett selskap"
      description="Opprett selskap via base-service/system-admin/companies."
      routeLinks={
        <Button asChild variant="outline">
          <NavLink to={ROUTES_MAP['system-admin.companies'].href}>Tilbake til selskaper</NavLink>
        </Button>
      }
    >
      {actionData?.error ? (
        <Notice tone="emphasis" title="Kunne ikke opprette selskap" message={actionData.error} />
      ) : null}
      <Panel
        title="Selskapsinformasjon"
        description="Oppgi organisasjonsnummer og Google Place ID for selskapet som skal opprettes."
      >
        <form method="post" className="space-y-4">
          <FormField label="Organisasjonsnummer" name="orgNumber" defaultValue={values.orgNumber} required />
          <FormField
            label="Google Place ID"
            name="googlePlaceId"
            defaultValue={values.googlePlaceId}
            required
            helperText="Påkrevd for Google reviews og synkronisering."
          />
          <Button type="submit">Opprett selskap</Button>
        </form>
      </Panel>

      {actionData?.company ? (
        <Panel title="Opprettet selskap" description="Backend-respons etter opprettelse.">
          <Text as="p" variant="body-sm">
            ID: {actionData.company.id}
          </Text>
          <Text as="p" variant="body-sm">
            Org.nr: {actionData.company.orgNumber}
          </Text>
          <Text as="p" variant="body-sm">
            Navn: {actionData.company.name ?? '—'}
          </Text>
        </Panel>
      ) : null}
    </CompanyPageTemplate>
  );
}
