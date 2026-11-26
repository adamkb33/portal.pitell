import { redirect } from 'react-router';

import { verificationSessionToken } from '~/lib/auth.server';
import { getBookingRouteMap } from '../../../../_utils/booking.route-map';

export async function requireVerificationToken(request: Request) {
  const routes = getBookingRouteMap();
  const cookieHeader = request.headers.get('Cookie');
  const token = await verificationSessionToken.parse(cookieHeader);
  if (!token || typeof token !== 'string') {
    return redirect(routes.contact);
  }
  return token;
}
