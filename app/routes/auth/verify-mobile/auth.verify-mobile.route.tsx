// auth.verify-mobile.route.tsx
import * as React from 'react';
import { Link, data, useFetcher } from 'react-router';
import type { Route } from './+types/auth.verify-mobile.route';

import { AuthController } from '~/api/generated/base';
import { API_ROUTES_MAP, ROUTES_MAP } from '~/lib/route-tree';
import { resolveErrorPayload } from '~/lib/api-error';
import { AuthFormContainer } from '../_components/auth.form-container';
import { Label } from '@/components/ui/label';
import { VerificationCodeInput } from '@/components/ui/verification-code-input';
import { AuthFormButton } from '../_components/auth.form-button';
import type { action as verifyMobileAction } from '~/routes/api/auth/verify-mobile/auth.verify-mobile.api-route';
import { requireVerificationToken } from '~/routes/booking/public/appointment/session/contact/_utils/auth.utils.server';

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

export default function AuthVerifyMobile({ loaderData }: Route.ComponentProps) {
  const dataValues = loaderData as VerifyMobileLoaderData;
  const fetcher = useFetcher<typeof verifyMobileAction>();
  const [code, setCode] = React.useState('');

  const isSubmitting = fetcher.state === 'submitting';
  const fetcherError =
    typeof fetcher.data === 'object' && fetcher.data && 'error' in fetcher.data ? fetcher.data.error : null;
  const errorMessage = fetcherError ?? dataValues.error;
  const isMobileVerified =
    typeof fetcher.data === 'object' && fetcher.data && 'success' in fetcher.data
      ? fetcher.data.success === true
      : false;
  const signedIn =
    typeof fetcher.data === 'object' && fetcher.data && 'signedIn' in fetcher.data ? fetcher.data.signedIn : false;
  const status = dataValues.status;
  const canVerifyMobile =
    status?.emailVerified && status?.mobileRequired && !status.mobileVerified && !isMobileVerified;

  React.useEffect(() => {
    if (signedIn) {
      window.location.href = '/';
    }
  }, [signedIn]);
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

        {canVerifyMobile ? (
          <fetcher.Form method="post" action={API_ROUTES_MAP['auth.verify-mobile'].url} className="space-y-4">
            <input type="hidden" name="verificationSessionToken" value={dataValues.verificationSessionToken ?? ''} />

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
          </fetcher.Form>
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
