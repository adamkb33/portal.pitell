// auth.verify-mobile.route.tsx
import * as React from 'react';
import { Link, data, redirect, Form, useActionData, useNavigation } from 'react-router';
import type { Route } from './+types/auth.verify-mobile.route';

import { AuthController, type VerificationStatusResponseDto } from '~/api/generated';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { resolveErrorPayload } from '~/lib/api-error';
import { requireVerificationToken } from '~/routes/booking/public/appointment/session/contact/_utils/auth.utils.server';
import { resolveAuthNextStepHref } from '../_utils/auth-flow';
import { authService } from '~/lib/auth-service';
import { redirectWithError } from '~/lib/flash-message.server';
import { AuthPageTemplate, Button, Label, Notice, VerificationCodeInput } from '~/ui';
import { VerificationTokenService } from '~/routes/booking/public/appointment/session/contact/_services/verification-token.service.server';

type VerifyMobileLoaderData = {
  verificationSessionToken: string;
  status?: VerificationStatusResponseDto;
  error?: string | null;
};

type VerifyMobileActionData = {
  message: string;
};

export async function loader({ request }: Route.LoaderArgs) {
  const verificationSessionToken = await requireVerificationToken(request);
  if (verificationSessionToken instanceof Response) {
    return verificationSessionToken;
  }

  try {
    const response = await AuthController.verificationStatus({
      query: { verificationSessionToken },
    });
    const status = response.data?.data;
    if (!status) {
      return data(
        {
          verificationSessionToken,
          error: 'Kunne ikke hente verifiseringsstatus. Prøv igjen.',
        },
        { status: 400 },
      );
    }

    if (status.nextStep !== 'VERIFY_MOBILE') {
      const nextStepHref = resolveAuthNextStepHref(status.nextStep);
      if (nextStepHref) {
        return redirect(nextStepHref);
      }
    }

    return data({
      verificationSessionToken,
      status,
      error: null,
    } satisfies VerifyMobileLoaderData);
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke hente verifiseringsstatus. Prøv igjen.');
    return data(
      {
        verificationSessionToken,
        error: message,
      },
      { status: status ?? 400 },
    );
  }
}

export async function action({ request }: Route.ActionArgs) {
  const currentHref = new URL(request.url);
  const currentPath = `${currentHref.pathname}${currentHref.search}`;
  const formData = await request.formData();
  const intent = String(formData.get('intent') || 'verify');

  const verificationSessionToken = await VerificationTokenService.readVerificationToken(request);

  if (!verificationSessionToken) {
    return redirectWithError(request, currentPath, 'Mangler verifiseringsinformasjon. Prøv igjen.');
  }

  try {
    if (intent === 'resend') {
      const response = await AuthController.resendVerificationMobileOnly({
        body: {
          verificationSessionToken,
          sendEmail: false,
          sendMobile: true,
        },
      });

      const nextToken = response.data?.data?.verificationToken?.value ?? verificationSessionToken;
      const nextTokenExpiresAt = response.data?.data?.verificationToken?.expiresAt ?? null;
      const successMessage = response.data?.message?.value ?? 'Ny SMS sendt.';
      const headers = new Headers();

      if (nextToken) {
        const cookie = await VerificationTokenService.buildVerificationCookieHeader(
          nextToken,
          nextTokenExpiresAt ?? undefined,
        );
        headers.append('Set-Cookie', cookie);
      }

      return data({ message: successMessage } satisfies VerifyMobileActionData, { headers });
    }

    const code = String(formData.get('code') || '');
    const response = await AuthController.verifyMobile({
      body: {
        verificationSessionToken,
        code,
      },
    });

    const payload = response.data?.data;

    if (payload?.authTokens) {
      const headers = await authService.setAuthCookies(
        payload.authTokens.accessToken,
        payload.authTokens.refreshToken,
        payload.authTokens.accessTokenExpiresAt,
        payload.authTokens.refreshTokenExpiresAt,
      );
      return redirect('/', { headers });
    }

    const nextStepHref = resolveAuthNextStepHref(payload?.nextStep ?? null);
    return redirect(nextStepHref ?? ROUTES_MAP['auth.sign-in'].href);
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke bekrefte mobilnummer. Prøv igjen.');
    return redirectWithError(request, currentPath, message);
  }
}

export default function AuthVerifyMobile({ loaderData }: Route.ComponentProps) {
  const dataValues = loaderData as VerifyMobileLoaderData;
  const actionData = useActionData<typeof action>() as VerifyMobileActionData | undefined;
  const navigation = useNavigation();
  const [code, setCode] = React.useState('');

  const isSubmitting = navigation.state === 'submitting';
  const errorMessage = dataValues.error;
  const isMobileVerified = false;
  const status = dataValues.status;
  const canVerifyMobile =
    status?.emailVerified && status?.mobileRequired && !status.mobileVerified && !isMobileVerified;
  const resendMessage = actionData?.message ? String(actionData.message) : null;
  const description = !status?.emailVerified
    ? 'Bekreft e-posten din før du verifiserer mobilnummer.'
    : status?.mobileRequired
      ? 'E-posten din er bekreftet. Skriv inn engangskoden fra SMS for å fullføre registreringen.'
      : 'Du trenger ikke verifisere mobilnummer. Du kan gå videre til innlogging.';

  return (
    <AuthPageTemplate
      title="Bekreft mobilnummer"
      description={description}
      error={errorMessage}
      topRight={
        <span>
          Trenger du å logge inn?{' '}
          <Link
            to={ROUTES_MAP['auth.sign-in'].href}
            className="font-semibold text-interactive hover:text-interactive-hover"
          >
            Logg inn
          </Link>
        </span>
      }
      bottom={
        canVerifyMobile
          ? 'Skriv inn koden fra SMS-en vi sendte deg.'
          : 'Du kan fortsette når verifiseringen er fullført.'
      }
    >
      <div className="space-y-4">
        {!status?.emailVerified ? (
          <Notice message="Du må bekrefte e-posten din før mobilnummeret kan verifiseres." />
        ) : null}

        {status && !status.mobileRequired ? (
          <Notice message="Du la ikke til et mobilnummer. Du kan gå videre til innlogging." />
        ) : null}

        {isMobileVerified ? (
          <Notice message="Mobilnummeret ditt er bekreftet. Du kan gå videre til innlogging." />
        ) : null}
        {resendMessage ? <Notice message={resendMessage} /> : null}

        {canVerifyMobile ? (
          <>
            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="verify" />

              <div className="space-y-3">
                <Label htmlFor="code">Engangskode</Label>
                <VerificationCodeInput
                  id="code"
                  name="code"
                  value={code}
                  onChange={setCode}
                  required
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errorMessage)}
                />
              </div>

              <Button type="submit" fullWidth loading={isSubmitting}>
                Bekreft mobilnummer
              </Button>
            </Form>

            <Form method="post">
              <input type="hidden" name="intent" value="resend" />
              <button
                type="submit"
                className="text-sm font-medium text-foreground hover:underline"
                disabled={isSubmitting}
              >
                Send SMS på nytt
              </button>
            </Form>
          </>
        ) : null}

        {(status?.mobileVerified || isMobileVerified || !status?.mobileRequired) && (
          <Button asChild variant="secondary" fullWidth>
            <Link to={ROUTES_MAP['auth.sign-in'].href}>Gå til innlogging</Link>
          </Button>
        )}
      </div>
    </AuthPageTemplate>
  );
}
