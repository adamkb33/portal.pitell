// auth.check-email.route.tsx
import * as React from 'react';
import { Link, data, Form, useActionData, useNavigate, useNavigation, useRevalidator } from 'react-router';
import type { Route } from './+types/auth.check-email.route';

import { ROUTES_MAP } from '~/lib/route-tree';
import { AuthController, type DeliveryStatusDto, type VerificationStatusResponseDto } from '~/api/generated/base';
import { resolveErrorPayload } from '~/lib/api-error';
import { AuthFormContainer } from '../_components/auth.form-container';
import { resolveAuthNextStepHref } from '../_utils/auth-flow';
import { getVerificationTokenFromRequest } from '~/routes/booking/public/appointment/session/contact/_utils/auth.utils.server';
import { VerificationTokenService } from '~/routes/booking/public/appointment/session/contact/_services/verification-token.service.server';

type CheckEmailLoaderData = {
  emailDelivery: DeliveryStatusDto['status'] | null;
  mobileDelivery: DeliveryStatusDto['status'] | null;
  verificationSessionToken: string | null;
  nextStep: VerificationStatusResponseDto['nextStep'] | null;
};

const DELIVERY_STATUSES = new Set<DeliveryStatusDto['status']>([
  'SENT',
  'SKIPPED_ALREADY_ACTIVE',
  'NOT_ATTEMPTED',
  'FAILED',
]);

function parseDeliveryStatus(value: string | null): DeliveryStatusDto['status'] | null {
  if (!value || !DELIVERY_STATUSES.has(value as DeliveryStatusDto['status'])) {
    return null;
  }
  return value as DeliveryStatusDto['status'];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const emailDelivery = parseDeliveryStatus(url.searchParams.get('emailDelivery'));
  const mobileDelivery = parseDeliveryStatus(url.searchParams.get('mobileDelivery'));
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

  return data({ emailDelivery, mobileDelivery, verificationSessionToken, nextStep } satisfies CheckEmailLoaderData);
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

    return data(
      {
        success: true,
        message: successMessage,
        emailDelivery: response.data?.data?.emailDelivery?.status ?? null,
        mobileDelivery: response.data?.data?.mobileDelivery?.status ?? null,
      },
      { headers },
    );
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke sende ny kode. Prøv igjen.');
    return data({ error: message }, { status: status ?? 400 });
  }
}

export default function AuthCheckEmail({ loaderData }: Route.ComponentProps) {
  const { emailDelivery, mobileDelivery, verificationSessionToken, nextStep } = loaderData;
  const actionData = useActionData<typeof action>();
  const effectiveEmailDelivery =
    actionData && typeof actionData === 'object' && 'emailDelivery' in actionData && actionData.emailDelivery
      ? actionData.emailDelivery
      : emailDelivery;
  const effectiveMobileDelivery =
    actionData && typeof actionData === 'object' && 'mobileDelivery' in actionData && actionData.mobileDelivery
      ? actionData.mobileDelivery
      : mobileDelivery;
  const hasError = effectiveEmailDelivery === 'FAILED';
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
          ? 'Vi klarte ikke å sende verifiseringslenken. Prøv å sende på nytt.'
          : 'Bekreft e-posten din for å fortsette.'
      }
      error={hasError ? 'Kunne ikke sende e-post.' : undefined}
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
        {effectiveEmailDelivery === 'SENT' ? <p>Vi har sendt en ny verifiseringslenke til e-posten din.</p> : null}
        {effectiveEmailDelivery === 'SKIPPED_ALREADY_ACTIVE' ? (
          <p>En gyldig verifiseringslenke finnes allerede. Sjekk innboksen din.</p>
        ) : null}
        {effectiveMobileDelivery === 'SENT' || effectiveMobileDelivery === 'SKIPPED_ALREADY_ACTIVE' ? (
          <p>Etter e-postbekreftelse kan mobilverifisering være neste steg.</p>
        ) : null}
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
