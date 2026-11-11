// app/routes/api/company/booking/profile/daily-schedule/delete.api-route.ts
import { type ActionFunctionArgs } from 'react-router';
import { DailyScheduleController } from '~/api/generated';
import { redirectWithSuccess, redirectWithError } from '~/lib/flash-message.server';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { withAuth } from '~/api/utils/with-auth';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const id = Number(formData.get('id'));

    await withAuth(request, async () => {
      await DailyScheduleController.deleteDailySchedule({
        path: { id },
      });
    });

    return redirectWithSuccess(request, ROUTES_MAP['company.booking.profile'].href, 'Arbeidstid fjernet');
  } catch (error: any) {
    console.error(JSON.stringify(error, null, 2));

    return redirectWithError(
      request,
      ROUTES_MAP['company.booking.profile'].href,
      error?.message || 'Kunne ikke fjerne arbeidstid',
    );
  }
}
