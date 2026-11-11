import { data } from 'react-router';
import type { BookingProfileDto, CreateOrUpdateCompanyUserProfile, GroupedServiceGroupDto } from '~/api/generated';
import { CompanyUserBookingProfileController, CompanyUserServiceGroupController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { redirectWithSuccess, setFlashMessage } from '~/lib/flash-message.server';

export type BookingProfileFormLoaderData = {
  bookingProfile: BookingProfileDto | null;
  groupedServiceGroups: GroupedServiceGroupDto[];
  error: string | null;
};

export async function loadBookingProfileFormData(request: Request): Promise<BookingProfileFormLoaderData> {
  try {
    const [bookingProfileResponse, groupedServiceGroupsResponse] = await withAuth(request, async () => {
      return Promise.all([
        CompanyUserBookingProfileController.getBookingProfile(),
        CompanyUserServiceGroupController.getGroupedServiceGroups(),
      ]);
    });

    return {
      bookingProfile: bookingProfileResponse.data?.id ? bookingProfileResponse.data : null,
      groupedServiceGroups: groupedServiceGroupsResponse.data?.data ?? [],
      error: null,
    };
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente bookingprofil');
    return {
      bookingProfile: null,
      groupedServiceGroups: [],
      error: message,
    };
  }
}

export async function submitBookingProfileForm(
  request: Request,
  section: 'profile' | 'services' | 'schedule' = 'profile',
) {
  try {
    const formData = await request.formData();
    const current = await withAuth(request, () => CompanyUserBookingProfileController.getBookingProfile());
    const profile = current.data?.id ? current.data : null;
    if (!profile && section !== 'profile') throw new Error('Opprett en bookingprofil først');

    const payload: CreateOrUpdateCompanyUserProfile = {
      description:
        section === 'profile' ? String(formData.get('description') ?? '').trim() || undefined : profile?.description,
      serviceIds:
        section === 'services'
          ? formData
              .getAll('services[]')
              .map(Number)
              .filter((id) => Number.isInteger(id) && id > 0)
          : (profile?.services.flatMap((group) => group.services.map((service) => service.id)) ?? []),
    };

    if (section === 'schedule') {
      const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;
      const selected = new Set(formData.getAll('days').map(String));
      const fieldErrors: Record<string, string> = {};
      payload.dailySchedules = days
        .filter((day) => selected.has(day))
        .map((dayOfWeek) => {
          const startTime = String(formData.get(`${dayOfWeek}-start`) ?? '');
          const endTime = String(formData.get(`${dayOfWeek}-end`) ?? '');
          const validTime = /^([01]\d|2[0-3]):[0-5]\d$/;
          if (!validTime.test(startTime) || !validTime.test(endTime)) fieldErrors[dayOfWeek] = 'Velg fra- og tiltid';
          else if (startTime >= endTime) fieldErrors[dayOfWeek] = 'Tiltid må være etter fratid';
          return {
            id: profile?.dailySchedule.find((day) => day.dayOfWeek === dayOfWeek)?.id ?? 0,
            dayOfWeek,
            startTime: `${startTime}:00`,
            endTime: `${endTime}:00`,
          };
        });
      if (Object.keys(fieldErrors).length) return data({ fieldErrors }, { status: 400 });
    }

    if (section === 'profile') {
      const imageFile = formData.get('imageFile');
      if (imageFile instanceof File && imageFile.size > 0) {
        payload.imageAction = {
          type: 'Upload',
          data: {
            fileName: imageFile.name,
            contentType: imageFile.type || 'application/octet-stream',
            data: Buffer.from(await imageFile.arrayBuffer()).toString('base64'),
            label: imageFile.name,
          },
        };
      } else if (formData.get('removeImage') === 'true' && profile?.image?.id) {
        payload.imageAction = { type: 'Delete', imageId: profile.image.id };
      }
    }

    await withAuth(request, () =>
      CompanyUserBookingProfileController.createOrUpdateProfile({
        body: payload,
        // The generated discriminator uses class names; Jackson expects its uppercase wire names.
        bodySerializer: () => ({
          ...payload,
          imageAction: payload.imageAction
            ? { ...payload.imageAction, type: payload.imageAction.type.toUpperCase() }
            : undefined,
        }),
      }),
    );
    return redirectWithSuccess(request, ROUTES_MAP['company.booking.profile'].href, 'Bookingprofil lagret');
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke lagre bookingprofil');
    const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
    return data({ error: message }, { status: status ?? 400, headers: { 'Set-Cookie': flashCookie } });
  }
}
