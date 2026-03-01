// routes/api/company/admin/employees/invite.api-route.ts
import { type ActionFunctionArgs } from 'react-router';
import { ROUTES_MAP } from '~/lib/route-tree';
import { redirectWithError, redirectWithSuccess } from '~/routes/company/_lib/flash-message.server';
import { AdminCompanyController } from '~/api/generated/base';
import { withAuth } from '~/api/utils/with-auth';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const email = formData.get('email');
    const rolesJson = formData.get('roles');

    if (!email || !rolesJson) {
      return redirectWithError(request, ROUTES_MAP['company.admin.employees'].href, 'Manglende skjemadata');
    }

    let roles: Array<'ADMIN' | 'EMPLOYEE'>;
    try {
      roles = JSON.parse(rolesJson.toString());
    } catch {
      return redirectWithError(request, ROUTES_MAP['company.admin.employees'].href, 'Ugyldig rolledata');
    }

    await withAuth(request, async () => {
      await AdminCompanyController.inviteCompanyUser({
        body: {
          email: email.toString(),
          roles,
        },
      });
    });

    return redirectWithSuccess(request, ROUTES_MAP['company.admin.employees'].href, 'Invitasjon sendt');
  } catch (error: any) {
    console.error(error);
    const errorMessage = error?.message || 'Kunne ikke invitere bruker';
    return redirectWithError(request, ROUTES_MAP['company.admin.employees'].href, errorMessage);
  }
}
