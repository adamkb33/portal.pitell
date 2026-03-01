import { data } from 'react-router';
import type { Route } from './+types/auth.verification-status.api-route';
import { AuthController } from '~/api/generated/base';
import { resolveErrorPayload } from '~/lib/api-error';
import { getVerificationTokenFromRequest } from '~/routes/booking/public/appointment/session/contact/_utils/auth.utils';

export async function loader({ request }: Route.LoaderArgs) {
  const verificationSessionToken = await getVerificationTokenFromRequest(request);

  if (!verificationSessionToken) {
    return data({ error: 'Mangler verifiseringsinformasjon. Prøv igjen.' }, { status: 400 });
  }

  try {
    const response = await AuthController.verificationStatus({
      query: { verificationSessionToken },
    });

    return data({
      success: true,
      nextStep: response.data?.data?.nextStep ?? null,
    });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke hente status. Prøv igjen.');
    return data({ error: message }, { status: status ?? 400 });
  }
}
