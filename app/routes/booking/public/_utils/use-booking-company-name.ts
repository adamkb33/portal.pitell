import { useRouteLoaderData } from 'react-router';
import type { loader } from '~/routes/booking/public/appointment/session/booking.public.appointment.session.layout';

const SESSION_LAYOUT_ID = 'routes/booking/public/appointment/session/booking.public.appointment.session.layout';

/** The salon being booked, shown as the small label above every step's title. */
export function useBookingCompanyName(): string | undefined {
  return useRouteLoaderData<typeof loader>(SESSION_LAYOUT_ID)?.companyName ?? undefined;
}
