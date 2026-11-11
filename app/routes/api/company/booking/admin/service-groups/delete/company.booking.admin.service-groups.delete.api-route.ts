import { loader as requireBookingAdmin } from '~/routes/company/booking/admin/company.booking.admin.layout';
import { CompanyUserServiceGroupController } from '~/api/generated';
import { redirectWithSuccess, redirectWithError } from '~/lib/flash-message.server';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import type { Route } from './+types/company.booking.admin.service-groups.delete.api-route';
import { withAuth } from '~/api/utils/with-auth';

export async function action({ request }: Route.ActionArgs) {
  await requireBookingAdmin({ request });
  try {
    const formData = await request.formData();
    const id = Number(formData.get('id'));

    await withAuth(request, async () => {
      return CompanyUserServiceGroupController.deleteServiceGroup({ path: { id } });
    });

    return redirectWithSuccess(
      request,
      ROUTES_MAP['company.booking.admin.service-groups'].href,
      'Tjenestegruppe slettet',
    );
  } catch (error: any) {
    console.error(JSON.stringify(error, null, 2));
    return redirectWithError(
      request,
      ROUTES_MAP['company.booking.admin.service-groups'].href,
      error?.message || 'Kunne ikke slette tjenestegruppe',
    );
  }
}
