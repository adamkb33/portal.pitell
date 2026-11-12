import { data } from 'react-router';
import { formatInTimeZone } from 'date-fns-tz';
import type { Route } from './+types/company.booking.schedule.availabilities.edit.route';
import { Booking } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { redirectWithError, redirectWithSuccess, setFlashMessage } from '~/lib/flash-message.server';
import { formatLocalDateTimeInTimeZone } from '~/lib/query';
import type { FormPageHandle } from '~/lib/routing/create-action';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { Notice } from '~/ui';
import { AvailabilityFormPage } from '../_components/availability-form-page';

/** A form page: the phone bottom menu hides and the page shows its own Lagre bar (ui-rules, rule 5). */
export const handle: FormPageHandle = { formPage: true };

const TIME_ZONE = 'Europe/Oslo';
const LIST_HREF = () => ROUTES_MAP['company.booking.schedule.availabilities'].href;

const isPast = (endTime: string) => new Date(endTime).getTime() < Date.now();

export async function loader({ request }: Route.LoaderArgs) {
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isFinite(id) || id <= 0) {
    return redirectWithError(request, LIST_HREF(), 'Fant ikke tidsrommet');
  }

  try {
    const response = await withAuth(request, async () => Booking.getAvailability({ path: { id } }));
    const availability = response.data?.data;
    if (!availability) return redirectWithError(request, LIST_HREF(), 'Fant ikke tidsrommet');
    if (isPast(availability.endTime)) {
      return redirectWithError(request, LIST_HREF(), 'Tidligere bookbar tid kan ikke endres');
    }

    const start = new Date(availability.startTime);
    return data({
      values: {
        id: availability.id,
        date: formatInTimeZone(start, TIME_ZONE, 'yyyy-MM-dd'),
        startTime: formatInTimeZone(start, TIME_ZONE, 'HH:mm'),
        endTime: formatInTimeZone(availability.endTime, TIME_ZONE, 'HH:mm'),
      },
      error: null as string | null,
    });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke hente bookbar tid');
    return data({ values: null, error: message }, { status: status ?? 400 });
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const id = Number(formData.get('id'));
  if (!Number.isFinite(id) || id <= 0) {
    return redirectWithError(request, LIST_HREF(), 'Fant ikke tidsrommet');
  }

  try {
    const current = (await withAuth(request, async () => Booking.getAvailability({ path: { id } }))).data?.data;
    if (!current) return redirectWithError(request, LIST_HREF(), 'Fant ikke tidsrommet');
    if (isPast(current.endTime)) {
      return redirectWithError(request, LIST_HREF(), 'Tidligere bookbar tid kan ikke endres');
    }

    if (formData.get('intent') === 'delete') {
      await withAuth(request, async () => Booking.deleteAvailability({ path: { id } }));
      return redirectWithSuccess(request, LIST_HREF(), 'Bookbar tid slettet');
    }

    const date = String(formData.get('date') ?? '');
    const startTime = String(formData.get('startTime') ?? '');
    const endTime = String(formData.get('endTime') ?? '');
    if (!date || !startTime || !endTime || startTime >= endTime) {
      const flash = await setFlashMessage(request, { type: 'error', text: 'Til må være etter fra.' });
      return data(null, { status: 400, headers: { 'Set-Cookie': flash } });
    }

    await withAuth(request, async () =>
      Booking.updateAvailability({
        path: { id },
        body: {
          startTime: formatLocalDateTimeInTimeZone(date, startTime, TIME_ZONE),
          endTime: formatLocalDateTimeInTimeZone(date, endTime, TIME_ZONE),
        },
      }),
    );
    return redirectWithSuccess(request, LIST_HREF(), 'Bookbar tid lagret');
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke lagre bookbar tid');
    const flash = await setFlashMessage(request, { type: 'error', text: message });
    return data(null, { status: 400, headers: { 'Set-Cookie': flash } });
  }
}

export default function CompanyBookingScheduleAvailabilitiesEditPage({ loaderData }: Route.ComponentProps) {
  if (!loaderData.values) {
    return <Notice tone="emphasis" title="Kunne ikke hente bookbar tid" message={loaderData.error ?? ''} />;
  }
  return <AvailabilityFormPage mode="edit" values={loaderData.values} />;
}
