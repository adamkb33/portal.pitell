import { data } from 'react-router';
import { format } from 'date-fns';
import type { Route } from './+types/company.booking.schedule.availabilities.create.route';
import { Booking } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { redirectWithSuccess, setFlashMessage } from '~/lib/flash-message.server';
import { formatLocalDateTimeInTimeZone } from '~/lib/query';
import type { FormPageHandle } from '~/lib/routing/create-action';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { AvailabilityFormPage } from '../_components/availability-form-page';

/** A form page: the phone bottom menu hides and the page shows its own Lagre bar (ui-rules, rule 5). */
export const handle: FormPageHandle = { formPage: true };

const TIME_ZONE = 'Europe/Oslo';

/** Opens on today 15:00–19:00 (the old inline form's default); a link may prefill ?date=&startTime=&endTime=. */
export async function loader({ request }: Route.LoaderArgs) {
  const params = new URL(request.url).searchParams;
  return {
    values: {
      date: params.get('date') ?? format(new Date(), 'yyyy-MM-dd'),
      startTime: params.get('startTime') ?? '15:00',
      endTime: params.get('endTime') ?? '19:00',
    },
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const date = String(formData.get('date') ?? '');
  const startTime = String(formData.get('startTime') ?? '');
  const endTime = String(formData.get('endTime') ?? '');

  if (!date || !startTime || !endTime || startTime >= endTime) {
    const flash = await setFlashMessage(request, { type: 'error', text: 'Til må være etter fra.' });
    return data(null, { status: 400, headers: { 'Set-Cookie': flash } });
  }

  try {
    await withAuth(request, async () =>
      Booking.createAvailabilities({
        body: [
          {
            from: formatLocalDateTimeInTimeZone(date, startTime, TIME_ZONE),
            to: formatLocalDateTimeInTimeZone(date, endTime, TIME_ZONE),
          },
        ],
      }),
    );
    return redirectWithSuccess(
      request,
      ROUTES_MAP['company.booking.schedule.availabilities'].href,
      'Bookbar tid lagret',
    );
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke lagre bookbar tid');
    const flash = await setFlashMessage(request, { type: 'error', text: message });
    return data(null, { status: 400, headers: { 'Set-Cookie': flash } });
  }
}

export default function CompanyBookingScheduleAvailabilitiesCreatePage({ loaderData }: Route.ComponentProps) {
  return <AvailabilityFormPage mode="create" values={loaderData.values} />;
}
