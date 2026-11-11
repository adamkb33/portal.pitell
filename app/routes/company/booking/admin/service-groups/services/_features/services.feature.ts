import { loader as requireBookingAdmin } from '~/routes/company/booking/admin/company.booking.admin.layout';
import { ServiceController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { redirectWithSuccess, redirectWithError } from '~/lib/flash-message.server';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { resolveErrorPayload } from '~/lib/api-error';
import type { Route } from '../+types/company.booking.admin.service-groups.services.route';

export async function servicesActions({ request }: Route.ActionArgs) {
  await requireBookingAdmin({ request });
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  try {
    if (intent === 'create') {
      const name = formData.get('name') as string;
      const serviceGroupId = Number(formData.get('serviceGroupId'));
      const price = Number(formData.get('price'));
      const duration = Number(formData.get('duration'));

      const imageActions = extractImageActionsFromFormData(formData);

      await withAuth(request, async () => {
        const response = await ServiceController.createService({
          body: {
            name,
            serviceGroupId,
            price,
            duration,
            imageActions,
          },
        });

        if (!response.data?.data) {
          throw new Error('Failed to create service');
        }
      });

      return redirectWithSuccess(request, ROUTES_MAP['company.booking.admin.services'].href, 'Tjeneste opprettet');
    }

    if (intent === 'update') {
      const id = Number(formData.get('id'));
      const name = formData.get('name') as string;
      const serviceGroupId = Number(formData.get('serviceGroupId'));
      const price = Number(formData.get('price'));
      const duration = Number(formData.get('duration'));

      const imageActions = extractImageActionsFromFormData(formData);

      await withAuth(request, async () => {
        await ServiceController.updateService({
          path: { id },
          body: {
            id,
            name,
            serviceGroupId,
            price,
            duration,
            imageActions,
          },
        });
      });

      return redirectWithSuccess(request, ROUTES_MAP['company.booking.admin.services'].href, 'Tjeneste oppdatert');
    }

    if (intent === 'delete') {
      const id = Number(formData.get('id'));

      await withAuth(request, async () => {
        await ServiceController.deleteService({ path: { id } });
      });

      return redirectWithSuccess(request, ROUTES_MAP['company.booking.admin.services'].href, 'Tjeneste slettet');
    }

    return redirectWithError(request, ROUTES_MAP['company.booking.admin.services'].href, 'Ugyldig handling');
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke utføre handling');

    return redirectWithError(request, ROUTES_MAP['company.booking.admin.services'].href, message);
  }
}

function extractImageActionsFromFormData(formData: FormData): any[] {
  const imageActions: any[] = [];

  const deleteImageIds = formData
    .getAll('deleteImageIds')
    .map((v) => Number(v))
    .filter((v) => !Number.isNaN(v));

  deleteImageIds.forEach((imageId) => {
    imageActions.push({
      type: 'DELETE',
      imageId,
    });
  });

  let index = 0;
  while (formData.has(`images[${index}][fileName]`)) {
    const fileName = formData.get(`images[${index}][fileName]`) as string;
    const contentType = formData.get(`images[${index}][contentType]`) as string;
    const data = formData.get(`images[${index}][data]`) as string;
    const label = formData.get(`images[${index}][label]`) as string;

    if (fileName && contentType && data) {
      imageActions.push({
        type: 'UPLOAD',
        data: {
          fileName,
          contentType,
          data,
          label: label || undefined,
        },
      });
    }

    index++;
  }

  return imageActions;
}
