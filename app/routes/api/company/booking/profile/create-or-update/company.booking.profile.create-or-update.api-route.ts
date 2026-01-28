import { type ActionFunctionArgs } from 'react-router';
import { CompanyUserBookingProfileController } from '~/api/generated/booking';
import { redirectWithSuccess, redirectWithError } from '~/routes/company/_lib/flash-message.server';
import { ROUTES_MAP } from '~/lib/route-tree';
import { withAuth } from '~/api/utils/with-auth';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const description = formData.get('description') as string;
    const services = formData.getAll('services[]').map(Number);
    const imageAction = formData.get('imageAction') as string | null;
    const dailySchedulesRaw = formData.get('dailySchedules') as string | null;

    const payload: any = {
      description: description || undefined,
      serviceIds: services,
    };

    // Handle daily schedules
    if (dailySchedulesRaw) {
      try {
        const dailySchedules = JSON.parse(dailySchedulesRaw);
        if (Array.isArray(dailySchedules) && dailySchedules.length > 0) {
          payload.dailySchedules = dailySchedules;
        }
      } catch (err) {
        console.error('Failed to parse dailySchedules:', err);
      }
    }

    // Handle image action
    if (imageAction === 'UPLOAD') {
      const fileName = formData.get('imageData[fileName]') as string;
      const contentType = formData.get('imageData[contentType]') as string;
      const data = formData.get('imageData[data]') as string;
      const label = formData.get('imageData[label]') as string;

      payload.imageAction = {
        type: 'UPLOAD',
        data: {
          fileName,
          contentType,
          data,
          label,
        },
      };
    } else if (imageAction === 'DELETE') {
      payload.imageAction = {
        type: 'UPLOAD',
      };
    }

    await withAuth(request, async () => {
      await CompanyUserBookingProfileController.createOrUpdateProfile({
        body: payload,
      });
    });

    return redirectWithSuccess(request, ROUTES_MAP['company.booking.profile'].href, 'Bookingprofil lagret');
  } catch (error: any) {
    console.error('Profile update error:', JSON.stringify(error, null, 2));

    return redirectWithError(
      request,
      ROUTES_MAP['company.booking.profile'].href,
      error?.message || 'Kunne ikke lagre bookingprofil',
    );
  }
}
