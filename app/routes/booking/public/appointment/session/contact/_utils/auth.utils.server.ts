import { redirect } from 'react-router';

import { verificationSessionToken } from '~/lib/auth.server';
import { ROUTES_MAP } from '~/lib/route-tree';

export async function requireVerificationToken(request: Request) {
  const cookieHeader = request.headers.get('Cookie');
  const token = await verificationSessionToken.parse(cookieHeader);
  if (!token || typeof token !== 'string') {
    return redirect(ROUTES_MAP['booking.public.appointment.session.contact'].href);
  }
  return token;
}

export const getVerificationTokenFromRequest = async (request: Request) => {
  const cookieHeader = request.headers.get('Cookie');
  const token = await verificationSessionToken.parse(cookieHeader);
  if (!token || typeof token !== 'string') {
    return null;
  }
  return token;
};
