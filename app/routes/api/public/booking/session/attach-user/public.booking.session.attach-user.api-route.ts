import { data } from 'react-router';
import { PublicAppointmentSessionController } from '~/api/generated';
import { resolveErrorPayload } from '~/lib/api-error';
import { withoutLogin } from '~/lib/auth-middleware.server';
import type { Route } from './+types/public.booking.session.attach-user.api-route';

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const sessionId = String(formData.get('sessionId') || '');

  try {
    const response = await withoutLogin(() =>
      PublicAppointmentSessionController.setPendingAppointmentSessionUser({
        path: { sessionId },
      }),
    );

    return data(response.data);
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke knytte brukeren til økten.');
    return data({ error: message }, { status: status ?? 400 });
  }
}
