import * as React from 'react';
import { data, Form, useNavigation, useLocation, redirect } from 'react-router';
import type { Route } from './+types/booking.public.appointment.session.contact.sign-in.route';
import { ROUTES_MAP } from '~/lib/route-tree';
import { ProviderButtons } from '~/routes/auth/_components/provider-buttons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  BookingButton,
  BookingErrorBanner,
  BookingSection,
  BookingStepHeader,
} from '../../../_components/booking-layout';
import { LogIn } from 'lucide-react';
import { redirectWithError, redirectWithInfo } from '~/routes/company/_lib/flash-message.server';
import { resolveErrorPayload } from '~/lib/api-error';
import { logger } from '~/lib/logger';
import { accessTokenCookie, refreshTokenCookie } from '~/routes/auth/_features/auth.cookies.server';
import { ContactAuthService } from '../_services/contact-auth.service.server';

export async function loader({ request }: Route.LoaderArgs) {
  const { AppointmentSessionService } = await import('../../_services/appointment-session.service.server');
  const session = await AppointmentSessionService.get(request);
  if (!session) {
    return redirectWithError(
      request,
      ROUTES_MAP['booking.public.appointment.session'].href,
      'Kunne ikke hente session',
    );
  }

  const url = new URL(request.url);
  const email = url.searchParams.get('email') || '';

  return data({ session, email });
}

export async function action({ request }: Route.ActionArgs) {
  logger.info('[sign-in] Action called', { request });

  const formData = await request.formData();
  const provider = String(formData.get('provider') || 'LOCAL');
  const idToken = String(formData.get('idToken') || '');
  const email = String(formData.get('email') || '');
  const password = String(formData.get('password') || '');
  const redirectUrl = String(formData.get('redirectUrl') || '');
  const isGoogleLogin = provider === 'GOOGLE';

  if (isGoogleLogin && !idToken) {
    return data({ error: 'Kunne ikke logge inn med Google. Prøv igjen.' }, { status: 400 });
  }

  try {
    const response = isGoogleLogin
      ? await ContactAuthService.signInWithProvider({
          provider: 'GOOGLE',
          idToken,
          redirectUrl,
        })
      : await ContactAuthService.signInLocal({
          emailOrMobile: email,
          password,
          redirectUrl,
        });

    if (response?.userId) {
      await ContactAuthService.attachUserToSession(request, response.userId);
    }

    let headers = new Headers();
    if (response?.authTokens) {
      headers.append('Set-Cookie', response.authTokens.accessToken);
      headers.append('Set-Cookie', response.authTokens.refreshToken);
      headers.append(
        'Set-Cookie',
        await accessTokenCookie.serialize(response.authTokens.accessToken, {
          expires: new Date(response.authTokens.accessTokenExpiresAt * 1000),
        }),
      );
      headers.append(
        'Set-Cookie',
        await refreshTokenCookie.serialize(response.authTokens.refreshToken, {
          expires: new Date(response.authTokens.refreshTokenExpiresAt * 1000),
        }),
      );
    }

    const { nextStepHref, verificationCookieHeader } = await ContactAuthService.resolvePostAuthRedirect(response);
    if (verificationCookieHeader) {
      headers.append('Set-Cookie', verificationCookieHeader);
    }

    if (nextStepHref) {
      return redirect(nextStepHref, { headers });
    }

    return redirectWithInfo(
      request,
      ROUTES_MAP['booking.public.appointment.session.contact'].href,
      'Kunne ikke logge inn. Prøv igjen.',
    );
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke logge inn. Prøv igjen.');
    return data({ error: message }, { status: status ?? 400 });
  }
}

export default function BookingPublicAppointmentSessionContactSignInRoute({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const location = useLocation();
  const isSubmitting = navigation.state === 'submitting';
  const [email, setEmail] = React.useState<string | null>(loaderData.email || null);
  const isGoogleProvider = React.useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('provider') === 'GOOGLE';
  }, [location.search]);

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email') || '';
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [location.search]);

  return (
    <>
      <BookingStepHeader label="Kontakt" title="Logg inn" description="Logg inn for å fortsette booking." />

      <BookingSection title="Logg inn med e-post" variant="elevated">
        <Form method="post" className="space-y-4 md:space-y-5" aria-busy={isSubmitting}>
          <ProviderButtons showDivider={!isGoogleProvider} />
          {actionData && 'error' in actionData && <BookingErrorBanner title={actionData.error} />}
          <input type="hidden" name="redirectUrl" value="booking" />

          {!isGoogleProvider ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-form-text md:text-base">
                  E-post
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email || undefined}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isSubmitting}
                  className="h-12 bg-form-bg border-form-border text-base placeholder:text-form-text-muted focus:border-form-ring focus:ring-form-ring md:h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-form-text md:text-base">
                  Passord
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  className="h-12 bg-form-bg border-form-border text-base placeholder:text-form-text-muted focus:border-form-ring focus:ring-form-ring md:h-11"
                />
              </div>

              <div className="pt-2">
                <BookingButton type="submit" size="lg" fullWidth variant="primary" className="justify-start gap-3">
                  <LogIn className="size-5" />
                  Logg inn
                </BookingButton>
              </div>
            </>
          ) : null}
        </Form>
      </BookingSection>
    </>
  );
}
