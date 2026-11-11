import { redirectWithError, redirectWithSuccess } from '~/lib/flash-message.server';
import type { Route } from './+types/company.admin.contacts.update.api-route';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { CompanyUserContactController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';

export async function action({ request }: Route.ActionArgs) {
  try {
    const formData = await request.formData();

    const id = Number(formData.get('id'));
    const givenName = String(formData.get('givenName') ?? '');
    const familyName = String(formData.get('familyName') ?? '');
    const email = formData.get('email') ? String(formData.get('email')) : undefined;
    const mobileNumber = formData.get('mobileNumber') ? String(formData.get('mobileNumber')) : undefined;

    await withAuth(request, async () => {
      await CompanyUserContactController.updateContact1({
        path: {
          id,
        },
        body: {
          givenName,
          familyName,
          email,
          mobileNumber,
        },
      });
    });

    return redirectWithSuccess(request, ROUTES_MAP['company.admin.contacts'].href, 'Kontakt oppdatert');
  } catch (error) {
    return redirectWithError(
      request,
      ROUTES_MAP['company.admin.contacts'].href,
      'Noe gikk galt ved oppdatering av kontakt',
    );
  }
}
