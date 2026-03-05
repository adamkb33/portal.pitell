// auth.verify-email.route.tsx
import { Link, data, redirect } from 'react-router';
import type { Route } from './+types/auth.verify-email.route';

import { AuthController } from '~/api/generated/base';
import { ROUTES_MAP } from '~/lib/route-tree';
import { resolveErrorPayload } from '~/lib/api-error';
import { verificationSessionToken } from '~/lib/auth.server';
import { AuthFormContainer } from '../_components/auth.form-container';
import { AuthFormButton } from '../_components/auth.form-button';
import { resolveAuthNextStepHref } from '../_utils/auth-flow';
import { authService } from '~/lib/auth-service';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const redirectUrl = url.searchParams.get('redirectUrl');

  if (!token) {
    return redirect(ROUTES_MAP['auth.sign-in'].href);
  }

  try {
    const response = await AuthController.verifyEmail({
      query: { token },
    });

    const payload = response.data?.data;
    const headers = new Headers();

    if (payload?.authTokens) {
      const authCookieHeaders = await authService.setAuthCookies(
        payload.authTokens.accessToken,
        payload.authTokens.refreshToken,
        payload.authTokens.accessTokenExpiresAt,
        payload.authTokens.refreshTokenExpiresAt,
      );
      for (const [key, value] of new Headers(authCookieHeaders).entries()) {
        headers.append(key, value);
      }
    }

    if (payload?.nextStep === 'VERIFY_MOBILE' && payload.verificationToken?.value) {
      const cookie = await verificationSessionToken.serialize(payload.verificationToken.value, {
        expires: new Date(payload.verificationToken.expiresAt),
      });
      headers.append('Set-Cookie', cookie);
      const params = new URLSearchParams({
        verificationSessionToken: payload.verificationToken?.value,
      });

      if (redirectUrl === 'booking') {
        return data(
          {
            error: null,
            nextStep: payload.nextStep,
            redirectUrl,
          },
          { headers: headers.entries().next().done ? undefined : headers },
        );
      }

      return redirect(`${ROUTES_MAP['auth.verify-mobile'].href}?${params.toString()}`, { headers });
    }

    if (payload?.nextStep) {
      const nextStepHref = resolveAuthNextStepHref(payload.nextStep);
      if (nextStepHref) {
        return redirect(nextStepHref, { headers: headers.entries().next().done ? undefined : headers });
      }
    }

    return data({
      error: null,
      nextStep: payload?.nextStep ?? 'DONE',
      redirectUrl,
    }, { headers: headers.entries().next().done ? undefined : headers });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Ugyldig eller utløpt verifiseringslenke.');
    return data({ error: message }, { status: status ?? 400 });
  }
}

export default function AuthVerifyEmail({ loaderData }: Route.ComponentProps) {
  const isSuccess = !loaderData?.error;
  const isBookingRedirect =
    !!loaderData &&
    typeof loaderData === 'object' &&
    'redirectUrl' in loaderData &&
    loaderData.redirectUrl === 'booking';

  return (
    <AuthFormContainer
      title={isSuccess ? 'E-post bekreftet' : 'Kunne ikke bekrefte e-post'}
      description={
        isSuccess
          ? isBookingRedirect
            ? 'E-postadressen din er nå verifisert. Gå tilbake til bookingen for å fortsette.'
            : 'E-postadressen din er nå verifisert.'
          : 'Vi klarte ikke å bekrefte e-posten din. Be om en ny lenke eller prøv igjen senere.'
      }
      error={loaderData?.error}
      secondaryAction={
        <Link to="/" className="block text-center text-sm font-medium text-muted-foreground hover:underline">
          Tilbake til forsiden →
        </Link>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-form-text-muted">
          {isSuccess
            ? isBookingRedirect
              ? 'Gå tilbake til bookingsteget ditt for å fullføre registreringen.'
              : 'Du kan nå gå videre til innlogging.'
            : 'Sjekk at du brukte den nyeste lenken fra e-posten, eller be om en ny verifisering.'}
        </p>
        {isBookingRedirect ? (
          <></>
        ) : (
          <AuthFormButton asChild variant="secondary">
            <Link to={ROUTES_MAP['auth.sign-in'].href}>Gå til innlogging</Link>
          </AuthFormButton>
        )}
      </div>
    </AuthFormContainer>
  );
}
