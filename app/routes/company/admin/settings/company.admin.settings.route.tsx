import type { FormPageHandle } from '~/lib/routing/create-action';
import { useState } from 'react';
import { data, Form, useNavigation } from 'react-router';
import type { Route } from './+types/company.admin.settings.route';
import { AdminCompanyController, CompanyUserController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { redirectWithSuccess, setFlashMessage } from '~/lib/flash-message.server';
import { formatOrgNumber } from '~/routes/company/_components/overview-rows';
import { CompanyFormPageTemplate, CompanyPageTemplate, FormField, PageNotice } from '~/ui';

/** A form page: the phone bottom menu hides and the page shows its own Lagre bar (ui-rules, rule 5). */
export const handle: FormPageHandle = { formPage: true };

const MISSING_NAME = 'Skriv inn selskapsnavn';

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const response = await withAuth(request, () => CompanyUserController.getCompanySummary());
    return data({ company: response.data?.data ?? null, error: null as string | null });
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente innstillinger');
    return data({ company: null, error: message });
  }
}

export async function action({ request }: Route.ActionArgs) {
  const displayName = String((await request.formData()).get('displayName') ?? '').trim();

  // The page keeps Lagre disabled without a name; this guards against a request made around it.
  if (!displayName) {
    const flashCookie = await setFlashMessage(request, { type: 'error', text: MISSING_NAME });
    return data({ error: MISSING_NAME }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }

  try {
    await withAuth(request, () => AdminCompanyController.updateCompanyDisplayName({ body: { displayName } }));
    return redirectWithSuccess(request, ROUTES_MAP['company.admin'].href, 'Selskapsnavn lagret');
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke lagre selskapsnavnet. Prøv igjen.');
    const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
    return data({ error: message }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }
}

/**
 * Innstillinger (Skjema, approved sketch 2026-11-14): the company name to edit, the org.nr and organisation type as
 * read-only facts from Brønnøysund, and Lagre, disabled while the name is empty.
 */
export default function CompanySettings({ loaderData }: Route.ComponentProps) {
  const { company } = loaderData;
  const navigation = useNavigation();
  const [name, setName] = useState(company?.name ?? '');

  if (!company) {
    return (
      <CompanyPageTemplate title="Innstillinger">
        <PageNotice title="Kunne ikke hente innstillinger" />
      </CompanyPageTemplate>
    );
  }

  const problem = name.trim() ? null : MISSING_NAME;
  const registry = [
    company.orgNumber ? formatOrgNumber(company.orgNumber) : null,
    company.organizationType?.description,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <CompanyFormPageTemplate
      title="Innstillinger"
      submit={{
        form: 'settings-form',
        loading: navigation.state === 'submitting',
        disabled: Boolean(problem),
        message: problem,
      }}
    >
      <Form id="settings-form" method="post">
        <FormField
          label="Selskapsnavn"
          name="displayName"
          autoComplete="organization"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Form>
      {registry ? (
        <dl className="border-t border-border pt-3">
          <dt className="text-xs text-text-secondary">Organisasjonsnummer</dt>
          <dd className="text-text-primary">{registry}</dd>
        </dl>
      ) : null}
    </CompanyFormPageTemplate>
  );
}
