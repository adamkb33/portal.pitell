import { data, redirect } from 'react-router';
import { ROUTES_MAP } from '~/lib/route-tree';
import { PublicAppointmentSessionController } from '~/api/generated/booking';
import { resolveErrorPayload } from '~/lib/api-error';
import type { Route } from '../+types/booking.public.appointment.session.select-time.route';
import { requireAuthenticatedBookingFlow } from '../../_utils/require-authenticated-booking-flow.server';

export async function appointmentSessionSelectTimeAction(args: Route.ActionArgs) {
  const guardResult = await requireAuthenticatedBookingFlow(args.request);
  if (guardResult instanceof Response) {
    return guardResult;
  }
  const { session } = guardResult;

  const formData = await args.request.formData();
  const selectedStartTime = formData.get('selectedStartTime') as string;

  try {
    await PublicAppointmentSessionController.submitAppointmentSessionStartTime({
      query: {
        sessionId: session.sessionId,
        selectedStartTime,
      },
    });

    return redirect(ROUTES_MAP['booking.public.appointment.session.overview'].href);
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke lagre tidspunkt');
    return data(
      {
        error: message,
      },
      { status: status ?? 400 },
    );
  }
}
