import { redirect } from 'react-router';
import type { Route } from './+types/auth.verify-email.route';

import { AuthController } from '~/api/generated';
import { resolveErrorPayload } from '~/lib/api-error';
import { verificationSessionToken } from '~/lib/auth.server';
import { redirectWithError, redirectWithSuccess } from '~/lib/flash-message.server';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { parseVerificationExpiry } from '~/routes/booking/public/appointment/session/contact/_services/verification-token.service.server';
import { resolveAuthNextStepHref } from '../_utils/auth-flow';
import { finishSignIn } from '../_utils/finish-sign-in.server';

const CONFIRMED = 'E-post bekreftet';

/**
 * The link in the email. It shows no page: the address is confirmed and the person goes straight on (the code step if
 * the mobile number isn't checked yet, otherwise in) with the toast "E-post bekreftet".
 */
export async function loader({ request }: Route.LoaderArgs) {
  const token = new URL(request.url).searchParams.get('token');
  if (!token) return redirect(ROUTES_MAP['auth.sign-in'].href);

  try {
    const payload = (await AuthController.verifyEmail({ query: { token } })).data?.data;

    if (payload?.nextStep === 'VERIFY_MOBILE' && payload.verificationToken?.value) {
      const headers = new Headers();
      headers.append(
        'Set-Cookie',
        await verificationSessionToken.serialize(payload.verificationToken.value, {
          expires: parseVerificationExpiry(payload.verificationToken.expiresAt),
        }),
      );
      const params = new URLSearchParams({ verificationSessionToken: payload.verificationToken.value });
      return redirectWithSuccess(request, `${ROUTES_MAP['auth.verify-mobile'].href}?${params}`, CONFIRMED, headers);
    }

    if (payload?.authTokens && (payload.nextStep ?? 'DONE') === 'DONE') {
      const { href, headers } = await finishSignIn(payload.authTokens, null);
      return redirectWithSuccess(request, href, CONFIRMED, headers);
    }

    const nextStepHref =
      payload?.nextStep && payload.nextStep !== 'DONE' ? resolveAuthNextStepHref(payload.nextStep) : null;
    return redirectWithSuccess(request, nextStepHref ?? ROUTES_MAP['auth.sign-in'].href, CONFIRMED);
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Ugyldig eller utløpt lenke.');
    return redirectWithError(request, ROUTES_MAP['auth.sign-in'].href, message);
  }
}

export default function AuthVerifyEmail() {
  return null;
}
