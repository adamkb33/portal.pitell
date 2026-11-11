import { redirect } from 'react-router';
import type { AppointmentSessionDto } from '~/api/generated';
import { PublicAppointmentSessionController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { AppointmentSessionService } from '../_services/booking.appointment-session.service.server';
import { withBookingBackendCall } from './booking-flow-log.server';
import { getBookingRouteMap } from './booking.route-map';

type GuardResult = {
  session: AppointmentSessionDto;
};

export async function requireBookingSession(request: Request): Promise<GuardResult | Response> {
  const routes = getBookingRouteMap();
  const sessionResult = await withBookingBackendCall(
    { request, routeId: 'booking.guard.require-session', step: 'guard', call: 'get-session' },
    () => AppointmentSessionService.getResult(request),
  );
  const session = sessionResult.status === 'found' ? sessionResult.session : null;

  if (sessionResult.status === 'stale-cookie') {
    const clearSessionCookie = await AppointmentSessionService.delete(request);
    // Gone or expired: drop the cookie and let the session route start a fresh session for the same company.
    return redirect(routes.session, {
      headers: {
        'Set-Cookie': clearSessionCookie,
      },
    });
  }

  if (!session) {
    return redirect(routes.session);
  }

  return { session };
}

export async function requireBookingReady(request: Request): Promise<GuardResult | Response> {
  const routes = getBookingRouteMap();
  const guardResult = await requireBookingSession(request);
  if (guardResult instanceof Response) {
    return guardResult;
  }

  const { session } = guardResult;

  try {
    const response = await withBookingBackendCall(
      { request, routeId: 'booking.guard.require-ready', step: 'guard', call: 'get-requirements', session },
      () =>
        withAuth(request, () =>
          PublicAppointmentSessionController.getAppointmentSessionRequirements({
            path: { sessionId: session.sessionId },
          }),
        ),
    );
    const requirements = response.data?.data;

    if (!requirements || requirements.nextStep !== 'DONE') {
      return redirect(routes.contact);
    }

    return { session };
  } catch {
    return redirect(routes.contact);
  }
}

export async function requireAuthenticatedBookingFlow(request: Request): Promise<GuardResult | Response> {
  return requireBookingReady(request);
}
