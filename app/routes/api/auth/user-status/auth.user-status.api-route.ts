import { data } from 'react-router';
import type { Route } from './+types/auth.user-status.api-route';
import { resolveErrorPayload } from '~/lib/api-error';
import { ContactAuthService } from '~/routes/booking/public/appointment/session/contact/_services/contact-auth.service.server';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const userIdParam = String(url.searchParams.get('userId') || '');
  const userId = Number(userIdParam);

  if (!userIdParam || Number.isNaN(userId)) {
    return data({ error: 'Mangler bruker-ID. Prøv igjen.' }, { status: 400 });
  }

  try {
    const response = await ContactAuthService.getUserStatus(request);
    return data(response ?? null);
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke hente brukerstatus. Prøv igjen.');
    return data({ error: message }, { status: status ?? 400 });
  }
}
