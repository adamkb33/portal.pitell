import { loader as requireBookingAdmin } from '~/routes/company/booking/admin/company.booking.admin.layout';
import type { Route } from './+types/company.booking.admin.service-groups.update.api-route';
import { CompanyUserServiceGroupController } from '~/api/generated';
import { redirectWithSuccess, redirectWithError } from '~/lib/flash-message.server';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { withAuth } from '~/api/utils/with-auth';

export async function action({ request }: Route.ActionArgs) {
  await requireBookingAdmin({ request });
  try {
    const formData = await request.formData();
    const id = Number(formData.get('id'));
    const name = formData.get('name') as string;

    await withAuth(request, async () => {
      return CompanyUserServiceGroupController.updateServiceGroup({
        path: {
          id,
        },
        body: {
          id,
          name,
        },
      });
    });

    return redirectWithSuccess(
      request,
      ROUTES_MAP['company.booking.admin.service-groups'].href,
      'Tjenestegruppe oppdatert',
    );
  } catch (error: any) {
    console.error(JSON.stringify(error, null, 2));
    return redirectWithError(
      request,
      ROUTES_MAP['company.booking.admin.service-groups'].href,
      error?.message || 'Kunne ikke oppdatere tjenestegruppe',
    );
  }
}
