import type { FormPageHandle } from '~/lib/routing/create-action';
import { useState } from 'react';
import { data, Form, useNavigation, useSearchParams } from 'react-router';
import type { Route } from './+types/company.admin.employees.invite.route';
import { CompanyRole } from '~/api/clients/types';
import { AdminCompanyController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { redirectWithSuccess, setFlashMessage } from '~/lib/flash-message.server';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { RoleCheckboxes } from '~/routes/company/_components/role-checkboxes';
import { CompanyFormPageTemplate, FormField } from '~/ui';

/** A form page: the phone bottom menu hides and the page shows its own bar (ui-rules, rule 5). */
export const handle: FormPageHandle = { formPage: true };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The first thing missing before the invite can go out, or null when it's ready (ui-rules, rule 5). */
function missing(email: string, roles: CompanyRole[]): string | null {
  if (!EMAIL_PATTERN.test(email.trim())) return 'Skriv inn en gyldig e-postadresse';
  if (roles.length === 0) return 'Velg minst én rolle';
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = String(formData.get('email') ?? '').trim();
  let roles: CompanyRole[] = [];
  try {
    roles = JSON.parse(String(formData.get('roles') ?? '[]')) as CompanyRole[];
  } catch {
    roles = [];
  }

  // The page keeps the button disabled until this passes; this guards against a request made around it.
  const problem = missing(email, roles);
  if (problem) {
    const flashCookie = await setFlashMessage(request, { type: 'error', text: problem });
    return data({ error: problem }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }

  try {
    await withAuth(request, () => AdminCompanyController.inviteCompanyUser({ body: { email, roles } }));
    return redirectWithSuccess(request, ROUTES_MAP['company.admin.employees'].href, 'Invitasjon sendt');
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke sende invitasjonen. Prøv igjen.');
    const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
    return data({ error: message }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }
}

/**
 * Inviter ansatt (Skjema, approved sketch 2026-11-14): the e-mail and the roles, "Ansatt" chosen from the start.
 * "Send invitasjon" stays disabled with one line saying what's missing until the form is valid.
 */
export default function CompanyAdminEmployeesInvitePage() {
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  // Statistikk's expired invitations open this page with the e-mail filled in (?email=…), ready to send again.
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [roles, setRoles] = useState<CompanyRole[]>([CompanyRole.EMPLOYEE]);
  const problem = missing(email, roles);

  return (
    <CompanyFormPageTemplate
      title="Inviter ansatt"
      submit={{
        form: 'invite-form',
        label: 'Send invitasjon',
        loading: navigation.state === 'submitting',
        disabled: Boolean(problem),
        message: problem,
      }}
    >
      <Form id="invite-form" method="post" className="flex flex-col gap-4">
        <input type="hidden" name="roles" value={JSON.stringify(roles)} />
        <FormField
          label="E-postadresse"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="off"
          placeholder="fornavn@gmail.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <span className="text-sm font-medium text-text-primary">Rolle</span>
          <RoleCheckboxes value={roles} onChange={setRoles} />
        </div>
      </Form>
    </CompanyFormPageTemplate>
  );
}
