import { data } from 'react-router';
import type { Route } from './+types/auth.verify-mobile.api-route';
import { resolveErrorPayload } from '~/lib/api-error';
import { VerificationTokenService } from '~/routes/booking/public/appointment/session/contact/_services/verification-token.service.server';
import { ContactAuthService } from '~/routes/booking/public/appointment/session/contact/_services/contact-auth.service.server';

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const code = String(formData.get('code') || '');

  const verificationSessionToken = await VerificationTokenService.readVerificationToken(request);

  if (!verificationSessionToken) {
    return data({ error: 'Mangler verifiseringsinformasjon. Prøv igjen.' }, { status: 400 });
  }

  try {
    const result = await ContactAuthService.verifyMobile({
      verificationSessionToken,
      code,
    });

    if (result.signedIn) {
      return data({ success: true, nextStep: result.nextStep, signedIn: true }, { headers: result.headers });
    }

    return data({ success: true, nextStep: result.nextStep, signedIn: false });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke bekrefte mobilnummer. Prøv igjen.');
    return data({ error: message }, { status: status ?? 400 });
  }
}
