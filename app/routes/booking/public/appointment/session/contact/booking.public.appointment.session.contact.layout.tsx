import { data, Outlet } from 'react-router';
import { BookingContainer } from '../../_components/booking-layout';
import type { Route } from './+types/booking.public.appointment.session.contact.layout';
import { ROUTES_MAP } from '~/lib/route-tree';
import { redirectWithError } from '~/routes/company/_lib/flash-message.server';
import { resolveErrorPayload } from '~/lib/api-error';

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const { ContactSessionService } = await import('./_services/contact-session.service.server');
    const { session, sessionUser, auth, verificationSessionToken } = await ContactSessionService.getContactContext(request);

    if (!session) {
      return redirectWithError(
        request,
        ROUTES_MAP['booking.public.appointment.session'].href,
        'Kunne ikke hente session',
      );
    }

    return data({
      session,
      sessionUser,
      auth,
      verificationSessionToken,
    });
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente session');
    console.error('[contact.layout] Loader failed', { message, error });
    return redirectWithError(request, ROUTES_MAP['booking.public.appointment.session'].href, message);
  }
}

export default function BookingPublicAppointmentSessionContactLayout() {
  return (
    <BookingContainer>
      <Outlet />
    </BookingContainer>
  );
}
