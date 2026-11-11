// app/routes/api/company/booking/profile/daily-schedule/create-or-update.api-route.ts
import { type ActionFunctionArgs } from 'react-router';
import { DailyScheduleController } from '~/api/generated';
import { redirectWithSuccess, redirectWithError } from '~/lib/flash-message.server';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { withAuth } from '~/api/utils/with-auth';

type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const id = formData.get('id') ? Number(formData.get('id')) : null;
    const dayOfWeek = formData.get('dayOfWeek') as DayOfWeek;
    const startTime = formData.get('startTime') as string;
    const endTime = formData.get('endTime') as string;

    const scheduleWithSeconds = {
      id: id ?? undefined,
      dayOfWeek,
      startTime: startTime.includes(':') && startTime.split(':').length === 2 ? `${startTime}:00` : startTime,
      endTime: endTime.includes(':') && endTime.split(':').length === 2 ? `${endTime}:00` : endTime,
    };

    await withAuth(request, async () => {
      await DailyScheduleController.createOrUpdateDailySchedules({
        body: [scheduleWithSeconds],
      });
    });

    return redirectWithSuccess(
      request,
      ROUTES_MAP['company.booking.profile'].href,
      id ? 'Arbeidstid oppdatert' : 'Arbeidstid lagret',
    );
  } catch (error: any) {
    console.error(JSON.stringify(error, null, 2));

    return redirectWithError(
      request,
      ROUTES_MAP['company.booking.profile'].href,
      error?.message || 'Kunne ikke lagre arbeidstid',
    );
  }
}
