import { data, redirect } from 'react-router';
import type { Route } from './+types/auth.verify-mobile.route';

import { AuthController } from '~/api/generated';
import { resolveErrorPayload } from '~/lib/api-error';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { readRetryAfterSeconds } from '~/routes/booking/public/appointment/session/contact/verify-mobile/_utils/sms-code-message';
import { requireVerificationToken } from '~/routes/booking/public/appointment/session/contact/_utils/auth.utils.server';
import { VerificationTokenService } from '~/routes/booking/public/appointment/session/contact/_services/verification-token.service.server';
import { AuthPageTemplate } from '~/ui';
import { CodeStepForm, type CodeActionData } from '../_components/code-step-form';
import { resolveAuthNextStepHref } from '../_utils/auth-flow';
import { finishSignIn } from '../_utils/finish-sign-in.server';
import { maskMobile } from '../_utils/mask-mobile';
import { describeSignInCodeError } from '../_utils/sign-in-code-errors';
import { clearSignInFlow, readSignInFlow } from '../_utils/sign-in-flow.cookie.server';

/**
 * The mobile check after sign-up (and after a sign-in or Google profile that still has an unchecked number): the
 * same code step as sign-in. The number shows when this browser typed it (sign-up, sign-in, Legg til mobilnummer).
 */
export async function loader({ request }: Route.LoaderArgs) {
  const verificationSessionToken = await requireVerificationToken(request);
  if (verificationSessionToken instanceof Response) {
    return verificationSessionToken;
  }

  try {
    const status = (await AuthController.verificationStatus({ query: { verificationSessionToken } })).data?.data;
    if (status && status.nextStep !== 'VERIFY_MOBILE') {
      const nextStepHref = resolveAuthNextStepHref(status.nextStep);
      if (nextStepHref) return redirect(nextStepHref);
    }
  } catch {
    // The code can still be checked; a stale session shows up as an error when they press Bekreft.
  }

  return { sentTo: maskMobile((await readSignInFlow(request))?.identifier) };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const verificationSessionToken = await VerificationTokenService.readVerificationToken(request);
  if (!verificationSessionToken) {
    return redirect(ROUTES_MAP['auth.sign-in'].href);
  }

  if (formData.get('intent') === 'resend') {
    try {
      const response = await AuthController.resendVerificationMobileOnly({
        body: { verificationSessionToken, sendEmail: false, sendMobile: true },
      });
      const nextToken = response.data?.data?.verificationToken;
      const headers = new Headers();
      if (nextToken?.value) {
        headers.append(
          'Set-Cookie',
          await VerificationTokenService.buildVerificationCookieHeader(
            nextToken.value,
            nextToken.expiresAt ?? undefined,
          ),
        );
      }
      return data<CodeActionData>({ ok: true, message: 'Ny kode sendt.' }, { headers });
    } catch (error) {
      const payload = resolveErrorPayload(error, 'Kunne ikke sende ny kode. Prøv igjen.');
      return data<CodeActionData>(
        { ok: false, error: describeSignInCodeError(payload), retryAfterSeconds: readRetryAfterSeconds(payload) },
        { status: 400 },
      );
    }
  }

  try {
    const code = String(formData.get('code') ?? '').trim();
    const payload = (await AuthController.verifyMobile({ body: { verificationSessionToken, code } })).data?.data;

    if (payload?.authTokens) {
      const flow = await readSignInFlow(request);
      const { href, headers } = await finishSignIn(payload.authTokens, flow?.returnTo ?? null);
      headers.append('Set-Cookie', await clearSignInFlow());
      return redirect(href, { headers });
    }

    return redirect(resolveAuthNextStepHref(payload?.nextStep ?? null) ?? ROUTES_MAP['auth.sign-in'].href);
  } catch (error) {
    const payload = resolveErrorPayload(error, 'Kunne ikke bekrefte koden. Prøv igjen.');
    return data<CodeActionData>({ ok: false, error: describeSignInCodeError(payload) }, { status: 400 });
  }
}

export default function AuthVerifyMobile({ loaderData, actionData }: Route.ComponentProps) {
  return (
    <AuthPageTemplate
      title="Skriv inn koden"
      description={loaderData.sentTo ? `Sendt på SMS til ${loaderData.sentTo}` : 'Sendt på SMS'}
    >
      <CodeStepForm actionData={actionData} />
    </AuthPageTemplate>
  );
}
