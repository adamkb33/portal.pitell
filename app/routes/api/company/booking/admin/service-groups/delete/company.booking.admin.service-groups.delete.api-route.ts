import { logger } from '~/lib/logger';
import { CompanyUserServiceGroupController } from '~/api/generated';
import { redirectWithSuccess, redirectWithError } from '~/lib/flash-message.server';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import type { Route } from './+types/company.booking.admin.service-groups.delete.api-route';

export async function action({ request }: Route.ActionArgs) {
  try {
    const formData = await request.formData();
    const id = Number(formData.get('id'));

    await CompanyUserServiceGroupController.deleteServiceGroup({ path: { id } });

    return redirectWithSuccess(
      request,
      ROUTES_MAP['company.booking.admin.service-groups'].href,
      'Tjenestegruppe slettet',
    );
  } catch (error: any) {
    logger.error('[company.booking.admin.service-groups.delete] failed', { error });
    return redirectWithError(
      request,
      ROUTES_MAP['company.booking.admin.service-groups'].href,
      error?.message || 'Kunne ikke slette tjenestegruppe',
    );
  }
}
