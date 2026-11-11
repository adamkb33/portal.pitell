import type { FormPageHandle } from '~/lib/routing/create-action';
import { loader as requireBookingAdmin } from '~/routes/company/booking/admin/company.booking.admin.layout';
import { data } from 'react-router';
import type { Route } from './+types/company.booking.admin.service-groups.edit.route';
import { CompanyUserServiceGroupController, ServiceController, type ServiceGroupDto } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { redirectWithInfo, redirectWithSuccess, setFlashMessage } from '~/lib/flash-message.server';
import { ServiceGroupFormPage, type ServiceGroupFormValues } from '../_components/service-group-form-page';

/** A form page: the phone bottom menu hides and the page shows its own Lagre bar (ui-rules, rule 2). */
export const handle: FormPageHandle = { formPage: true };

export async function loader({ request }: Route.LoaderArgs) {
  await requireBookingAdmin({ request });
  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id'));

  if (!Number.isFinite(id) || id <= 0) {
    return redirectWithInfo(
      request,
      ROUTES_MAP['company.booking.admin.service-groups'].href,
      'Velg en tjenestegruppe som skal redigeres.',
    );
  }

  try {
    // Services too: deleting the group deletes them, so the confirm dialog says how many.
    const [response, servicesResponse] = await withAuth(request, async () =>
      Promise.all([
        CompanyUserServiceGroupController.getServiceGroups({ query: { page: 0, size: 1000 } }),
        ServiceController.getServices({ query: { page: 0, size: 1000 } }),
      ]),
    );

    const serviceGroup = (response.data?.data?.content ?? []).find((item: ServiceGroupDto) => item.id === id) ?? null;
    const serviceCount = (servicesResponse.data?.data?.content ?? []).filter(
      (service) => service.serviceGroupId === id,
    ).length;

    if (!serviceGroup) {
      return redirectWithInfo(
        request,
        ROUTES_MAP['company.booking.admin.service-groups'].href,
        'Fant ikke tjenestegruppen du prøvde å redigere.',
      );
    }

    return data({
      values: {
        id: serviceGroup.id,
        name: serviceGroup.name,
      } satisfies ServiceGroupFormValues,
      serviceCount,
      error: null as string | null,
    });
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente tjenestegruppe');
    return data({
      values: {
        id,
        name: '',
      } satisfies ServiceGroupFormValues,
      error: message,
    });
  }
}

export async function action({ request }: Route.ActionArgs) {
  await requireBookingAdmin({ request });
  const formData = await request.formData();
  const id = Number(formData.get('id'));
  const values: ServiceGroupFormValues = {
    id,
    name: String(formData.get('name') ?? '').trim(),
  };

  if (!Number.isFinite(id) || id <= 0 || !values.name) {
    const error = 'Navn er påkrevd.';
    const flashCookie = await setFlashMessage(request, { type: 'error', text: error });
    return data({ error, values }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }

  try {
    await withAuth(request, async () => {
      await CompanyUserServiceGroupController.updateServiceGroup({
        path: { id },
        body: {
          id,
          name: values.name,
        },
      });
    });

    return redirectWithSuccess(request, ROUTES_MAP['company.booking.admin.service-groups'].href, 'Gruppe lagret');
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke oppdatere tjenestegruppe');
    const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
    return data({ error: message, values }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }
}

export default function CompanyBookingAdminServiceGroupsEditPage({ loaderData, actionData }: Route.ComponentProps) {
  return (
    <ServiceGroupFormPage
      mode="edit"
      values={actionData?.values ?? loaderData.values}
      serviceCount={'serviceCount' in loaderData ? loaderData.serviceCount : 0}
      actionData={actionData ?? (loaderData.error ? { error: loaderData.error, values: loaderData.values } : null)}
    />
  );
}
