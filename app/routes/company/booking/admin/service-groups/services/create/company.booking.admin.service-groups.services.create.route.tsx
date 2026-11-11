import type { FormPageHandle } from '~/lib/routing/create-action';
import { loader as requireBookingAdmin } from '~/routes/company/booking/admin/company.booking.admin.layout';
import { data } from 'react-router';
import type { Route } from './+types/company.booking.admin.service-groups.services.create.route';
import { CompanyUserServiceGroupController, ServiceController } from '~/api/generated';
import type { Delete, Upload } from '~/api/generated/types.gen';
import { withAuth } from '~/api/utils/with-auth';
import { redirectWithInfo, redirectWithSuccess, setFlashMessage } from '~/lib/flash-message.server';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { resolveErrorPayload } from '~/lib/api-error';
import { ServiceFormPage, type ServiceFormValues } from '../_components/service-form-page';

/** A form page: the phone bottom menu hides and the page shows its own Lagre bar (ui-rules, rule 2). */
export const handle: FormPageHandle = { formPage: true };

export async function loader({ request }: Route.LoaderArgs) {
  await requireBookingAdmin({ request });
  try {
    const response = await withAuth(request, async () =>
      CompanyUserServiceGroupController.getServiceGroups({
        query: {
          page: 0,
          size: 1000,
        },
      }),
    );

    const serviceGroups = response.data?.data?.content ?? [];

    if (serviceGroups.length === 0) {
      return redirectWithInfo(
        request,
        ROUTES_MAP['company.booking.admin.service-groups'].href,
        'Du må opprette en tjenestegruppe før du kan legge til tjenester.',
      );
    }

    return data({
      serviceGroups: serviceGroups.map((serviceGroup) => ({ id: serviceGroup.id!, name: serviceGroup.name })),
      values: {
        name: '',
        serviceGroupId: serviceGroups[0]?.id ?? 0,
        price: 0,
        duration: 30,
        images: [],
      } satisfies ServiceFormValues,
      error: null as string | null,
    });
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente tjenestegrupper');
    return data({
      serviceGroups: [],
      values: {
        name: '',
        serviceGroupId: 0,
        price: 0,
        duration: 30,
        images: [],
      } satisfies ServiceFormValues,
      error: message,
    });
  }
}

function extractImageActionsFromFormData(formData: FormData): Array<Delete | Upload> {
  const imageActions: Array<Delete | Upload> = [];
  const deleteImageIds = formData
    .getAll('deleteImageIds')
    .map((value) => Number(value))
    .filter((value) => !Number.isNaN(value));

  for (const imageId of deleteImageIds) {
    imageActions.push({
      type: 'Delete',
      imageId,
    });
  }

  let index = 0;
  while (formData.has(`images[${index}][fileName]`)) {
    const fileName = String(formData.get(`images[${index}][fileName]`) ?? '');
    const contentType = String(formData.get(`images[${index}][contentType]`) ?? '');
    const dataValue = String(formData.get(`images[${index}][data]`) ?? '');
    const label = String(formData.get(`images[${index}][label]`) ?? '');

    if (fileName && contentType && dataValue) {
      imageActions.push({
        type: 'Upload',
        data: {
          fileName,
          contentType,
          data: dataValue,
          label,
        },
      });
    }

    index += 1;
  }

  return imageActions;
}

export async function action({ request }: Route.ActionArgs) {
  await requireBookingAdmin({ request });
  const formData = await request.formData();
  const values = {
    name: String(formData.get('name') ?? '').trim(),
    serviceGroupId: Number(formData.get('serviceGroupId')),
    price: Number(formData.get('price')),
    duration: Number(formData.get('duration')),
  };

  if (
    !values.name ||
    !Number.isFinite(values.serviceGroupId) ||
    !Number.isFinite(values.price) ||
    !Number.isFinite(values.duration)
  ) {
    const error = 'Fyll ut alle feltene før du lagrer.';
    const flashCookie = await setFlashMessage(request, { type: 'error', text: error });
    return data({ error, values }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }

  try {
    await withAuth(request, async () => {
      await ServiceController.createService({
        body: {
          ...values,
          imageActions: extractImageActionsFromFormData(formData),
        },
      });
    });

    return redirectWithSuccess(request, ROUTES_MAP['company.booking.admin.services'].href, 'Tjeneste lagret');
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke opprette tjeneste');
    const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
    return data({ error: message, values }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }
}

export default function CompanyBookingAdminServicesCreatePage({ loaderData, actionData }: Route.ComponentProps) {
  return (
    <ServiceFormPage
      mode="create"
      values={loaderData.values}
      serviceGroups={loaderData.serviceGroups}
      actionData={actionData ?? (loaderData.error ? { error: loaderData.error } : null)}
    />
  );
}
