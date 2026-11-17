import { redirect } from 'react-router';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { getBookingRouteMap } from '~/routes/booking/public/_utils/booking.route-map';
import { clearManualContactOverride } from '../_utils/manual-contact-override.cookie.server';
import type { Route } from './+types/booking.public.appointment.session.contact.sign-in.route';

/**
 * "Logg inn" inside the booking flow uses the app's sign-in steps (number or email first, then password or a
 * code) and returns the customer to the contact step. Choosing to sign in drops the "fill in by hand" choice,
 * so the contact step picks up the account afterwards.
 */
export async function loader(_args: Route.LoaderArgs) {
  const returnTo = getBookingRouteMap().contact;
  return redirect(`${ROUTES_MAP['auth.sign-in'].href}?returnTo=${encodeURIComponent(returnTo)}`, {
    headers: { 'Set-Cookie': await clearManualContactOverride() },
  });
}

export default function BookingContactSignInPage() {
  return null;
}
