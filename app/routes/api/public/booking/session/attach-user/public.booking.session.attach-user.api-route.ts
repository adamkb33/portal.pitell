import { data } from 'react-router';
import type { Route } from './+types/public.booking.session.attach-user.api-route';
import { PublicAppointmentSessionController } from '~/api/generated/booking';
import { resolveErrorPayload } from '~/lib/api-error';

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const sessionId = String(formData.get('sessionId') || '');
  const userId = Number(formData.get('userId') || 0);

  try {
    const response = await PublicAppointmentSessionController.setPendingAppointmentSessionUser({
      path: { sessionId },
      query: { userId },
    });

    return data(response.data);
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke knytte brukeren til økten.');
    return data({ error: message }, { status: status ?? 400 });
  }
}
