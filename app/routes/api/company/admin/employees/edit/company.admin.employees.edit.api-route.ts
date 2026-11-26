// routes/api/company/admin/employees/edit.api-route.ts
import { type ActionFunctionArgs } from 'react-router';
import { logger } from '~/lib/logger';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { redirectWithError, redirectWithSuccess } from '~/lib/flash-message.server';
import { AdminCompanyController } from '~/api/generated';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const userId = formData.get('userId');
    const rolesToUpdate = formData.get('roles');

    if (!userId || !rolesToUpdate) {
      return redirectWithError(request, ROUTES_MAP['company.admin.employees'].href, 'Manglende skjemadata');
    }

    await AdminCompanyController.editCompanyUser({
      query: {
        userId: parseInt(userId.toString()),
      },
      body: {
        roles: rolesToUpdate.toString().split(',') as Array<'ADMIN' | 'EMPLOYEE'>,
      },
    });

    return redirectWithSuccess(request, ROUTES_MAP['company.admin.employees'].href, 'Ansattinformasjon oppdatert');
  } catch (error: any) {
    logger.error('[company.admin.employees.edit] failed', { error });
    const errorMessage = error?.message || 'Kunne ikke oppdatere ansatt';
    return redirectWithError(request, ROUTES_MAP['company.admin.employees'].href, errorMessage);
  }
}
