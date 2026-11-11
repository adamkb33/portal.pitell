import { Outlet, type ShouldRevalidateFunctionArgs } from 'react-router';
import { parseBookingContext } from '~/lib/booking-context.server';
import { formatCompanyName } from '~/routes/booking/public/_utils/booking-company-name';
import { getBookingCompanySummary } from '~/routes/booking/public/_utils/booking-company.server';
import { getBookingRouteMap } from '~/routes/booking/public/_utils/booking.route-map';
import type { Route } from './+types/booking.public.appointment.session.layout';

// Every step shows the salon's name in its header, so it is loaded once here.
export async function loader({ request }: Route.LoaderArgs) {
  const { companyId } = await parseBookingContext(request);
  const company = companyId ? await getBookingCompanySummary(companyId, request) : null;
  const name = company?.name?.trim();

  return { companyName: name ? formatCompanyName(name) : null };
}

// The salon is only set when a session starts, so skip the fetch on every other step.
export function shouldRevalidate({ currentUrl, nextUrl }: ShouldRevalidateFunctionArgs) {
  const sessionPath = getBookingRouteMap().session;
  return currentUrl.pathname === sessionPath || nextUrl.pathname === sessionPath;
}

export default function BookingPublicAppointmentSessionLayout() {
  return <Outlet />;
}
