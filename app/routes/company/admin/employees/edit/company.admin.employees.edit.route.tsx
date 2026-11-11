import type { FormPageHandle } from '~/lib/routing/create-action';
import { data, redirect } from 'react-router';
import type { Route } from './+types/company.admin.employees.edit.route';
import { CompanyRole } from '~/api/clients/types';
import { AdminCompanyController, AdminCompanyUserController, type CompanyUserDto } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { redirectWithInfo, setFlashMessage } from '~/lib/flash-message.server';
import { EmployeeFormPage, type EmployeeFormValues } from '../_components/employee-form-page';

/** A form page: the phone bottom menu hides and the page shows its own Lagre bar (ui-rules, rule 2). */
export const handle: FormPageHandle = { formPage: true };

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const userId = Number(url.searchParams.get('userId'));

  if (!Number.isFinite(userId) || userId <= 0) {
    return redirectWithInfo(request, ROUTES_MAP['company.admin.employees'].href, 'Velg en ansatt som skal redigeres.');
  }

  try {
    const response = await withAuth(request, async () =>
      AdminCompanyUserController.getCompanyUsers({
        query: {
          page: 0,
          size: 1000,
          includeDeleted: false,
        },
      }),
    );

    const user = (response.data?.data?.content ?? []).find((item: CompanyUserDto) => item.userId === userId) ?? null;

    if (!user) {
      return redirectWithInfo(
        request,
        ROUTES_MAP['company.admin.employees'].href,
        'Fant ikke den ansatte du prøvde å redigere.',
      );
    }

    return data({
      values: {
        userId: user.userId,
        email: user.email,
        roles: user.companyRoles as CompanyRole[],
      } satisfies EmployeeFormValues,
      error: null as string | null,
    });
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente ansatt');
    return data({
      values: {
        userId,
        email: '',
        roles: [],
      } satisfies EmployeeFormValues,
      error: message,
    });
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const userId = Number(formData.get('userId'));
  const email = String(formData.get('email') ?? '').trim();
  const rolesRaw = String(formData.get('roles') ?? '[]');
  let roles: CompanyRole[] = [];

  try {
    roles = JSON.parse(rolesRaw) as CompanyRole[];
  } catch {
    roles = [];
  }

  const values: EmployeeFormValues = { userId, email, roles };

  if (!Number.isFinite(userId) || userId <= 0 || roles.length === 0) {
    const error = 'Velg minst én rolle før du lagrer.';
    const flashCookie = await setFlashMessage(request, { type: 'error', text: error });
    return data({ error, values }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }

  try {
    await withAuth(request, async () => {
      await AdminCompanyController.editCompanyUser({
        query: {
          userId,
        },
        body: {
          roles,
        },
      });
    });

    return redirect(ROUTES_MAP['company.admin.employees'].href);
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke oppdatere ansatt');
    const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
    return data({ error: message, values }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }
}

export default function CompanyAdminEmployeesEditPage({ loaderData, actionData }: Route.ComponentProps) {
  return (
    <EmployeeFormPage
      mode="edit"
      values={actionData?.values ?? loaderData.values}
      actionData={actionData ?? (loaderData.error ? { error: loaderData.error, values: loaderData.values } : null)}
    />
  );
}
