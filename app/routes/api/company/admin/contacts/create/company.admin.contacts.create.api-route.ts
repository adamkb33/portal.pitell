import { redirectWithError, redirectWithSuccess } from '~/routes/company/_lib/flash-message.server';
import type { Route } from './+types/company.admin.contacts.create.api-route';
import { ROUTES_MAP } from '~/lib/route-tree';
import { CompanyUserContactController } from '~/api/generated/base';
import { withAuth } from '~/api/utils/with-auth';

export async function action({ request }: Route.ActionArgs) {
  try {
    const formData = await request.formData();

    const givenName = String(formData.get('givenName') ?? '');
    const familyName = String(formData.get('familyName') ?? '');
    const email = formData.get('email') ? String(formData.get('email')) : undefined;
    const mobileNumber = formData.get('mobileNumber') ? String(formData.get('mobileNumber')) : undefined;

    await withAuth(request, async () => {
      await CompanyUserContactController.createContact({
        body: {
          givenName,
          familyName,
          email,
          mobileNumber,
        },
      });
    });

    const referer = request.headers.get('Referer');
    const redirectTo = referer || ROUTES_MAP['company.admin.contacts'].href;

    return redirectWithSuccess(request, redirectTo, 'Kontakt opprettet');
  } catch (error) {
    const referer = request.headers.get('Referer');
    const redirectTo = referer || ROUTES_MAP['company.admin.contacts'].href;

    return redirectWithError(request, redirectTo, 'Noe gikk galt ved opprettelse av kontakt');
  }
}
