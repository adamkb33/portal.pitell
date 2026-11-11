import type { FormPageHandle } from '~/lib/routing/create-action';
import { data, redirect } from 'react-router';
import type { Route } from './+types/company.admin.employees.invite.route';
import { CompanyRole } from '~/api/clients/types';
import { AdminCompanyController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { setFlashMessage } from '~/lib/flash-message.server';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { EmployeeFormPage, type EmployeeFormValues } from '../_components/employee-form-page';

/** A form page: the phone bottom menu hides and the page shows its own Lagre bar (ui-rules, rule 2). */
export const handle: FormPageHandle = { formPage: true };

const emptyValues: EmployeeFormValues = {
  email: '',
  roles: [],
};

export async function loader() {
  return data({ values: emptyValues });
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = String(formData.get('email') ?? '').trim();
  const rolesRaw = String(formData.get('roles') ?? '[]');
  let roles: CompanyRole[] = [];

  try {
    roles = JSON.parse(rolesRaw) as CompanyRole[];
  } catch {
    roles = [];
  }

  const values: EmployeeFormValues = { email, roles };

  if (!email || roles.length === 0) {
    const error = 'Fyll inn e-post og velg minst én rolle.';
    const flashCookie = await setFlashMessage(request, { type: 'error', text: error });
    return data({ error, values }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }

  try {
    await withAuth(request, async () => {
      await AdminCompanyController.inviteCompanyUser({
        body: {
          email,
          roles,
        },
      });
    });

    return redirect(ROUTES_MAP['company.admin.employees'].href);
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke sende invitasjon');
    const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
    return data({ error: message, values }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }
}

export default function CompanyAdminEmployeesInvitePage({ loaderData, actionData }: Route.ComponentProps) {
  return <EmployeeFormPage mode="invite" values={loaderData.values} actionData={actionData} />;
}
