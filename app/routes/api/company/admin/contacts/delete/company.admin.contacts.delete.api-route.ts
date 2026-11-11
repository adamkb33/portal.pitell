import { redirectWithError, redirectWithSuccess } from '~/lib/flash-message.server';
import type { Route } from './+types/company.admin.contacts.delete.api-route';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { CompanyUserContactController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';

export async function action({ request }: Route.ActionArgs) {
  try {
    const formData = await request.formData();
    const id = Number(formData.get('id'));

    await withAuth(request, async () => {
      await CompanyUserContactController.deleteContact1({
        path: {
          id,
        },
      });
    });

    return redirectWithSuccess(request, ROUTES_MAP['company.admin.contacts'].href, 'Kontakt slettet');
  } catch (error) {
    return redirectWithError(
      request,
      ROUTES_MAP['company.admin.contacts'].href,
      'Noe gikk galt ved sletting av kontakt',
    );
  }
}
