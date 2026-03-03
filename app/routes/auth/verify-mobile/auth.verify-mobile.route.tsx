// auth.verify-mobile.route.tsx
import * as React from 'react';
import { Link, data, redirect, Form, useActionData, useNavigation } from 'react-router';
import type { Route } from './+types/auth.verify-mobile.route';

import { AuthController } from '~/api/generated/base';
import { ROUTES_MAP } from '~/lib/route-tree';
import { resolveErrorPayload } from '~/lib/api-error';
import { AuthFormContainer } from '../_components/auth.form-container';
import { Label } from '@/components/ui/label';
import { VerificationCodeInput } from '@/components/ui/verification-code-input';
import { AuthFormButton } from '../_components/auth.form-button';
import { ContactAuthService } from '~/routes/booking/public/appointment/session/contact/_services/contact-auth.service.server';
import { requireVerificationToken } from '~/routes/booking/public/appointment/session/contact/_utils/auth.utils.server';
import { VerificationTokenService } from '~/routes/booking/public/appointment/session/contact/_services/verification-token.service.server';
import { resolveAuthNextStepHref } from '../_utils/auth-flow';

type VerifyMobileLoaderData = {
  verificationSessionToken: string;
  status?: {
    emailVerified: boolean;
    mobileRequired: boolean;
    mobileVerified: boolean;
    emailSent: boolean;
    mobileSent: boolean;
    nextStep: 'VERIFY_EMAIL' | 'VERIFY_MOBILE' | 'SIGN_IN';
  };
  error?: string | null;
};

type VerifyMobileActionData =
  | {
      error: string;
      message?: never;
    }
  | {
      error?: never;
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
  const formData = await request.formData();
  const intent = String(formData.get('intent') || 'verify');

  const verificationSessionToken = await VerificationTokenService.readVerificationToken(request);

  if (!verificationSessionToken) {
    return data({ error: 'Mangler verifiseringsinformasjon. Prøv igjen.' }, { status: 400 });
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
    const result = await ContactAuthService.verifyMobile({
      verificationSessionToken,
      code,
    });

    if (result.signedIn) {
      return redirect('/', { headers: result.headers });
    }

    const nextStepHref = resolveAuthNextStepHref(result.nextStep);
    return redirect(nextStepHref ?? ROUTES_MAP['auth.sign-in'].href);
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke bekrefte mobilnummer. Prøv igjen.');
    return data({ error: message } satisfies VerifyMobileActionData, { status: status ?? 400 });
  }
}

export default function AuthVerifyMobile({ loaderData }: Route.ComponentProps) {
  const dataValues = loaderData as VerifyMobileLoaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [code, setCode] = React.useState('');

  const isSubmitting = navigation.state === 'submitting';
  const errorMessage =
    actionData && typeof actionData === 'object' && 'error' in actionData ? actionData.error : dataValues.error;
  const isMobileVerified = false;
  const status = dataValues.status;
  const canVerifyMobile =
    status?.emailVerified && status?.mobileRequired && !status.mobileVerified && !isMobileVerified;
  const resendMessage =
    actionData && typeof actionData === 'object' && 'message' in actionData
      ? String(actionData.message)
      : null;
  const description = !status?.emailVerified
    ? 'Bekreft e-posten din før du verifiserer mobilnummer.'
    : status?.mobileRequired
      ? 'E-posten din er bekreftet. Skriv inn engangskoden fra SMS for å fullføre registreringen.'
      : 'Du trenger ikke verifisere mobilnummer. Du kan gå videre til innlogging.';

  return (
    <AuthFormContainer
      title="Bekreft mobilnummer"
      description={description}
      error={errorMessage}
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
      <div className="space-y-4">
        {!status?.emailVerified ? (
          <div className="rounded-md border border-form-border bg-form-accent/30 px-4 py-3 text-sm text-form-text">
            Du må bekrefte e-posten din før mobilnummeret kan verifiseres.
          </div>
        ) : null}

        {status && !status.mobileRequired ? (
          <div className="rounded-md border border-form-border bg-form-accent/30 px-4 py-3 text-sm text-form-text">
            Du la ikke til et mobilnummer. Du kan gå videre til innlogging.
          </div>
        ) : null}

        {isMobileVerified ? (
          <div className="rounded-md border border-form-border bg-form-accent/30 px-4 py-3 text-sm text-form-text">
            Mobilnummeret ditt er bekreftet. Du kan gå videre til innlogging.
          </div>
        ) : null}
        {resendMessage ? <div className="text-sm text-green-700">{resendMessage}</div> : null}

        {canVerifyMobile ? (
          <>
            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="verify" />

              <div className="space-y-3">
                <Label htmlFor="code" className="text-xs font-medium uppercase tracking-[0.12em] text-form-text">
                  Engangskode
                </Label>
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

              <AuthFormButton isLoading={isSubmitting} loadingText="Bekrefter…">
                Bekreft mobilnummer
              </AuthFormButton>
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
          <AuthFormButton asChild variant="secondary">
            <Link to={ROUTES_MAP['auth.sign-in'].href}>Gå til innlogging</Link>
          </AuthFormButton>
        )}
      </div>
    </AuthFormContainer>
  );
}
