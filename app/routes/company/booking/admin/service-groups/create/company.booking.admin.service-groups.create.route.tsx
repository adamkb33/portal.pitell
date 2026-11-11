import type { FormPageHandle } from '~/lib/routing/create-action';
import { loader as requireBookingAdmin } from '~/routes/company/booking/admin/company.booking.admin.layout';
import { data } from 'react-router';
import type { Route } from './+types/company.booking.admin.service-groups.create.route';
import { CompanyUserServiceGroupController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { redirectWithSuccess, setFlashMessage } from '~/lib/flash-message.server';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { ServiceGroupFormPage, type ServiceGroupFormValues } from '../_components/service-group-form-page';

/** A form page: the phone bottom menu hides and the page shows its own Lagre bar (ui-rules, rule 2). */
export const handle: FormPageHandle = { formPage: true };

const emptyValues: ServiceGroupFormValues = { name: '' };

export async function loader({ request }: Route.LoaderArgs) {
  await requireBookingAdmin({ request });
  return data({ values: emptyValues });
}

export async function action({ request }: Route.ActionArgs) {
  await requireBookingAdmin({ request });
  const formData = await request.formData();
  const values: ServiceGroupFormValues = {
    name: String(formData.get('name') ?? '').trim(),
  };

  if (!values.name) {
    const error = 'Navn er påkrevd.';
    const flashCookie = await setFlashMessage(request, { type: 'error', text: error });
    return data({ error, values }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }

  try {
    await withAuth(request, async () => {
      await CompanyUserServiceGroupController.createServiceGroup({
        body: {
          name: values.name,
        },
      });
    });

    return redirectWithSuccess(request, ROUTES_MAP['company.booking.admin.service-groups'].href, 'Gruppe lagret');
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke opprette tjenestegruppe');
    const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
    return data({ error: message, values }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }
}

export default function CompanyBookingAdminServiceGroupsCreatePage({ loaderData, actionData }: Route.ComponentProps) {
  return <ServiceGroupFormPage mode="create" values={loaderData.values} actionData={actionData} />;
}
