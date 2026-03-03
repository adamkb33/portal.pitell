// auth.check-email.route.tsx
import * as React from 'react';
import { Link, data, Form, useActionData, useNavigate, useNavigation, useRevalidator } from 'react-router';
import type { Route } from './+types/auth.check-email.route';

import { ROUTES_MAP } from '~/lib/route-tree';
import { AuthController } from '~/api/generated/base';
import { resolveErrorPayload } from '~/lib/api-error';
import { AuthFormContainer } from '../_components/auth.form-container';
import { resolveAuthNextStepHref } from '../_utils/auth-flow';
import { getVerificationTokenFromRequest } from '~/routes/booking/public/appointment/session/contact/_utils/auth.utils.server';
import { VerificationTokenService } from '~/routes/booking/public/appointment/session/contact/_services/verification-token.service.server';

type CheckEmailLoaderData = {
  emailSent: boolean;
  mobileSent: boolean;
  verificationSessionToken: string | null;
  nextStep: 'VERIFY_EMAIL' | 'VERIFY_MOBILE' | 'SIGN_IN' | null;
};

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const emailSent = url.searchParams.get('emailSent') === 'true';
  const mobileSent = url.searchParams.get('mobileSent') === 'true';
  const verificationSessionToken = await getVerificationTokenFromRequest(request);
  let nextStep: CheckEmailLoaderData['nextStep'] = null;

  if (verificationSessionToken) {
    try {
      const response = await AuthController.verificationStatus({
        query: { verificationSessionToken },
      });
      nextStep = response.data?.data?.nextStep ?? null;
    } catch {
      nextStep = null;
    }
  }

  return data({ emailSent, mobileSent, verificationSessionToken, nextStep } satisfies CheckEmailLoaderData);
}

export async function action({ request }: Route.ActionArgs) {
  const verificationToken = await VerificationTokenService.readVerificationToken(request);

  if (!verificationToken) {
    return data({ error: 'Mangler verifiseringsinformasjon. Prøv igjen.' }, { status: 400 });
  }

  try {
    const response = await AuthController.resendVerificationEmailOnly({
      body: {
        verificationSessionToken: verificationToken,
        sendEmail: true,
        sendMobile: false,
      },
    });

    const nextToken = response.data?.data?.verificationToken?.value ?? verificationToken;
    const nextTokenExpiresAt = response.data?.data?.verificationToken?.expiresAt ?? null;
    const successMessage = response.data?.message?.value ?? 'Ny e-post sendt.';
    const headers = new Headers();

    if (nextToken) {
      const cookie = await VerificationTokenService.buildVerificationCookieHeader(nextToken, nextTokenExpiresAt ?? undefined);
      headers.append('Set-Cookie', cookie);
    }

    return data({ success: true, message: successMessage }, { headers });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke sende ny kode. Prøv igjen.');
    return data({ error: message }, { status: status ?? 400 });
  }
}

export default function AuthCheckEmail({ loaderData }: Route.ComponentProps) {
  const { emailSent, mobileSent, verificationSessionToken, nextStep } = loaderData;
  const actionData = useActionData<typeof action>();
  const hasError = !emailSent;
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const didNavigateRef = React.useRef(false);
  const isSubmitting = navigation.state === 'submitting';

  const resendError =
    actionData && typeof actionData === 'object' && 'error' in actionData
      ? String(actionData.error)
      : null;
  const resendSuccess =
    actionData && typeof actionData === 'object' && 'message' in actionData
      ? String(actionData.message)
      : null;

  React.useEffect(() => {
    if (!verificationSessionToken || nextStep !== 'VERIFY_EMAIL') {
      return;
    }

    const interval = window.setInterval(() => {
      if (revalidator.state !== 'idle') {
        return;
      }

      revalidator.revalidate();
    }, 1500);

    return () => window.clearInterval(interval);
  }, [nextStep, revalidator, verificationSessionToken]);

  React.useEffect(() => {
    if (!nextStep || didNavigateRef.current) {
      return;
    }

    if (nextStep !== 'VERIFY_EMAIL') {
      const nextStepHref = resolveAuthNextStepHref(nextStep);
      if (nextStepHref) {
        didNavigateRef.current = true;
        navigate(nextStepHref, { replace: true });
      }
    }
  }, [navigate, nextStep]);

  return (
    <AuthFormContainer
      title="Sjekk e-posten din"
      description={
        hasError
          ? 'Vi klarte ikke å sende verifiseringslenken. Prøv å registrere deg på nytt eller kontakt support.'
          : 'Vi har sendt deg en lenke for å bekrefte e-posten din.'
      }
      error={hasError ? 'E-posten ble ikke sendt.' : undefined}
      secondaryAction={
        <div className="space-y-2 text-center">
          <Link
            to={ROUTES_MAP['auth.sign-in'].href}
            className="inline-block text-sm font-medium text-foreground hover:underline"
          >
            Gå til innlogging →
          </Link>
          <Link to="/" className="block text-sm font-medium text-muted-foreground hover:underline">
            Tilbake til forsiden →
          </Link>
        </div>
      }
    >
      <div className="space-y-3 text-sm text-form-text-muted">
        <p>Følg instruksene i e-posten for å bekrefte kontoen din.</p>
        {mobileSent ? (
          <p>Når e-posten er bekreftet, vil du bli bedt om å verifisere mobilnummeret ditt med en SMS-kode.</p>
        ) : (
          <p>Du trenger ikke verifisere mobilnummer siden du ikke la til et nummer.</p>
        )}
        {resendError ? <p className="text-destructive">{resendError}</p> : null}
        {resendSuccess ? <p className="text-green-700">{resendSuccess}</p> : null}
        <Form method="post">
          <button
            type="submit"
            className="text-sm font-medium text-foreground hover:underline"
            disabled={isSubmitting}
          >
            Send e-posten på nytt
          </button>
        </Form>
      </div>
    </AuthFormContainer>
  );
}
