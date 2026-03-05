import { data, redirect } from 'react-router';
import { ROUTES_MAP } from '~/lib/route-tree';
import { PublicAppointmentSessionController } from '~/api/generated/booking';
import { resolveErrorPayload } from '~/lib/api-error';
import type { Route } from '../+types/booking.public.appointment.session.select-time.route';
import { requireAuthenticatedBookingFlow } from '../../_utils/require-authenticated-booking-flow.server';

export async function appointmentSessionSelectTimeLoader(args: Route.LoaderArgs) {
  const guardResult = await requireAuthenticatedBookingFlow(args.request);
  if (guardResult instanceof Response) {
    return guardResult;
  }
  const { session } = guardResult;

  try {
    const schedulesResponse = await PublicAppointmentSessionController.getAppointmentSessionSchedules({
      query: {
        sessionId: session.sessionId,
      },
    });

    return data({
      session,
      schedules: schedulesResponse.data?.data || [],
      error: null as string | null,
    });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke hente tilgjengelige tider');
    return data(
      {
        session: null,
        schedules: [],
        error: message,
      },
      { status: status ?? 400 },
    );
  }
}
