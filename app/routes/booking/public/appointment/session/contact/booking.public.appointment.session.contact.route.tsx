import * as React from 'react';
import { LogIn, UserPlus } from 'lucide-react';
import { data, Form, redirect, useNavigate } from 'react-router';
import { ProviderButtons } from '~/routes/auth/_components/provider-buttons';
import { BookingButton, BookingGrid, BookingSection, BookingStepHeader } from '../../_components/booking-layout';
import type { UserAuthStatusDto } from '~/api/generated/identity';
import { ROUTES_MAP } from '~/lib/route-tree';
import { redirectWithError, redirectWithInfo } from '~/routes/company/_lib/flash-message.server';
import { resolveErrorPayload } from '~/lib/api-error';
import type { Route } from './+types/booking.public.appointment.session.contact.route';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';
import { resolveAuthNextStepHref, resolveAuthStatusNextStepHref } from './_utils/auth.utils';
import { authService } from '~/lib/auth-service';
import { ContactSessionService } from './_services/contact-session.service.server';
import { accessTokenCookie, refreshTokenCookie } from '~/routes/auth/_features/auth.cookies.server';
import { logger } from '~/lib/logger';

const ACTION_INTENT = {
  CONTINUE_WITH_SESSION_USER: 'continue-with-session-user',
  CONTINUE_WITH_PROVIDER: 'continue-with-provider',
  CONTINUE_WITH_AUTHENTICATED_USER: 'continue-with-authenticated-user',
} as const;

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const { session, sessionUser, auth, verificationSessionToken } =
      await ContactSessionService.getContactContext(request);
    console.log(auth);

    if (!session) {
      return redirectWithError(
        request,
        ROUTES_MAP['booking.public.appointment.session'].href,
        'Kunne ikke hente session',
      );
    }

    return data({
      session,
      sessionUser,
      auth,
      verificationSessionToken,
    });
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente session');
    return redirectWithError(request, ROUTES_MAP['booking.public.appointment.session'].href, message);
  }
}

export async function action({ request }: Route.ActionArgs) {
  const { AppointmentSessionService } = await import('../_services/appointment-session.service.server');
  const { ContactAuthService } = await import('./_services/contact-auth.service.server');
  const formData = await request.formData();
  const intent = formData.get('intent');

  try {
    if (intent === ACTION_INTENT.CONTINUE_WITH_AUTHENTICATED_USER) {
      const auth = await authService.getAuth(request);
      if (!auth) {
        return redirectWithError(
          request,
          ROUTES_MAP['booking.public.appointment.session.contact'].href,
          'Kunne ikke hente autentisering',
        );
      }

      await AppointmentSessionService.attachUser(request, auth.id);

      return redirect(ROUTES_MAP['booking.public.appointment.session.employee'].href);
    }

    if (intent === ACTION_INTENT.CONTINUE_WITH_SESSION_USER) {
      const session = await AppointmentSessionService.get(request);
      logger.info('[booking.public.appointment.session.contact] CONTINUE_WITH_SESSION_USER', { session });
      if (!session) {
        logger.error('[booking.public.appointment.session.contact] CONTINUE_WITH_SESSION_USER no session');
        return redirectWithError(
          request,
          ROUTES_MAP['booking.public.appointment.session'].href,
          'Kunne ikke hente session, prøv å start på nytt',
        );
      }

      if (!session.userId) {
        logger.error('[booking.public.appointment.session.contact] CONTINUE_WITH_SESSION_USER no userId');
        return redirectWithError(
          request,
          ROUTES_MAP['booking.public.appointment.session.contact'].href,
          'Kunne ikke hente bruker-ID',
        );
      }

      const sessionUser = await ContactSessionService.getSessionUserStatus(request);
      if (!sessionUser) {
        logger.error('[booking.public.appointment.session.contact] CONTINUE_WITH_SESSION_USER no sessionUser');
        return redirect(`${ROUTES_MAP['booking.public.appointment.session.contact.sign-in'].href}`);
      }

      const auth = await authService.getAuth(request);
      if (!auth) {
        logger.error('[booking.public.appointment.session.contact] CONTINUE_WITH_SESSION_USER no auth');
        const signInHref = ROUTES_MAP['booking.public.appointment.session.contact.sign-in'].href;
        const params = new URLSearchParams();
        if (sessionUser.user.email) {
          params.set('email', sessionUser.user.email);
        }
        if (sessionUser.user.provider) {
          params.set('provider', sessionUser.user.provider);
        }
        return redirect(params.toString() ? `${signInHref}?${params.toString()}` : signInHref);
      }

      const profileStatus = await ContactSessionService.getSessionUserStatus(request);

      if (!profileStatus) {
        logger.error('[booking.public.appointment.session.contact] CONTINUE_WITH_SESSION_USER no profileStatus');
        return redirectWithError(
          request,
          ROUTES_MAP['booking.public.appointment.session.contact'].href,
          'Kunne ikke hente brukerstatus',
        );
      }

      const nextStepHref = resolveAuthNextStepHref(profileStatus.nextStep);
      if (nextStepHref) {
        logger.info('[booking.public.appointment.session.contact] CONTINUE_WITH_SESSION_USER', { nextStepHref });
        return redirect(nextStepHref);
      }

      return redirect(ROUTES_MAP['booking.public.appointment.session.employee'].href);
    }

    if (intent === ACTION_INTENT.CONTINUE_WITH_PROVIDER) {
      const provider = String(formData.get('provider') || 'LOCAL');
      const idToken = String(formData.get('idToken') || '');
      const redirectUrl = String(formData.get('redirectUrl') || '');
      const isGoogleLogin = provider === 'GOOGLE';

      if (!isGoogleLogin) {
        return redirectWithError(
          request,
          ROUTES_MAP['booking.public.appointment.session.contact'].href,
          'Ugyldig innloggingsleverandør.',
        );
      }

      if (isGoogleLogin && !idToken) {
        return redirectWithError(
          request,
          ROUTES_MAP['booking.public.appointment.session.contact'].href,
          'Kunne ikke logge inn med Google. Prøv igjen.',
        );
      }

      const response = await ContactAuthService.signInWithProvider({
        provider: 'GOOGLE',
        idToken,
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
    }

    return redirectWithError(
      request,
      ROUTES_MAP['booking.public.appointment.session.contact'].href,
      'Ugyldig handling.',
    );
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke fortsette. Prøv igjen.');
    return redirectWithError(request, ROUTES_MAP['booking.public.appointment.session.contact'].href, message);
  }
}

export default function BookingPublicAppointmentSessionContactRoute({ loaderData }: Route.ComponentProps) {
  const { sessionUser, auth, verificationSessionToken } = loaderData;
  const navigate = useNavigate();
  const sessionUserEmail = sessionUser?.user.email?.toLowerCase();
  const authEmail = auth?.email?.toLowerCase();
  const isSameSessionAndAuthenticatedUser = Boolean(
    sessionUser &&
      auth &&
      (sessionUser.user.id === auth.id || (sessionUserEmail && authEmail && sessionUserEmail === authEmail)),
  );
  const sessionInitials =
    `${sessionUser?.user.givenName?.[0] ?? ''}${sessionUser?.user.familyName?.[0] ?? ''}`.toUpperCase() || 'U';

  const goToSignIn = React.useCallback(
    (authStatus?: UserAuthStatusDto | null) => {
      const nextStepHref = verificationSessionToken ? resolveAuthStatusNextStepHref(authStatus) : null;
      if (nextStepHref) {
        navigate(nextStepHref);
        return;
      }
      const email = authStatus?.user?.email;
      const signInHref = email ? `sign-in?email=${email}` : 'sign-in';
      navigate(signInHref);
    },
    [navigate, verificationSessionToken],
  );

  const goToSignUp = React.useCallback(() => navigate('sign-up'), [navigate]);

  return (
    <>
      <BookingStepHeader
        label="Kontakt"
        title="Hvordan vil du fortsette?"
        description="Velg en av de følgende metodene for å fortsette."
      />

      <BookingSection title="Velg innloggingsmetode" variant="elevated">
        {sessionUser && !isSameSessionAndAuthenticatedUser && (
          <Form method="post">
            <button type="submit" name="intent" value={ACTION_INTENT.CONTINUE_WITH_SESSION_USER} className="w-full">
              <Card variant={'interactive'} size={'sm'} className="cursor-pointer flex gap-4">
                <CardHeader>
                  <div className="flex gap-4">
                    <div className="flex size-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                      {sessionInitials}
                    </div>
                    <div className="flex flex-col">
                      <CardTitle>
                        {sessionUser.user.givenName} {sessionUser.user.familyName}
                      </CardTitle>
                      <CardDescription>{sessionUser.user.email}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardFooter>
                  <div className="inline-flex w-full items-center justify-center gap-2 text-sm font-medium">
                    <LogIn className="size-5" />
                    Fortsett med denne brukeren
                  </div>
                </CardFooter>
              </Card>
            </button>
          </Form>
        )}
        {auth && !isSameSessionAndAuthenticatedUser && (
          <Form method="post">
            <button
              type="submit"
              name="intent"
              value={ACTION_INTENT.CONTINUE_WITH_AUTHENTICATED_USER}
              className="w-full"
            >
              <Card variant={'interactive'} size={'sm'} className="cursor-pointer flex gap-4">
                <CardHeader>
                  <div className="flex gap-4">
                    <div className="flex flex-col">
                      <CardTitle>{auth.email}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardFooter>
                  <div className="inline-flex w-full items-center justify-center gap-2 text-sm font-medium">
                    <LogIn className="size-5" />
                    Fortsett med innlogget bruker
                  </div>
                </CardFooter>
              </Card>
            </button>
          </Form>
        )}
        {sessionUser && auth && isSameSessionAndAuthenticatedUser && (
          <Form method="post">
            <button
              type="submit"
              name="intent"
              value={ACTION_INTENT.CONTINUE_WITH_AUTHENTICATED_USER}
              className="w-full"
            >
              <Card variant={'interactive'} size={'sm'} className="cursor-pointer flex gap-4">
                <CardHeader>
                  <div className="flex gap-4">
                    <div className="flex size-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                      {sessionInitials}
                    </div>
                    <div className="flex flex-col">
                      <CardTitle>
                        {sessionUser.user.givenName} {sessionUser.user.familyName}
                      </CardTitle>
                      <CardDescription>{sessionUser.user.email || auth.email}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardFooter>
                  <div className="inline-flex w-full items-center justify-center gap-2 text-sm font-medium">
                    <LogIn className="size-5" />
                    Fortsett som innlogget bruker
                  </div>
                </CardFooter>
              </Card>
            </button>
          </Form>
        )}
        <Form method="post">
          <input type="hidden" name="intent" value={ACTION_INTENT.CONTINUE_WITH_PROVIDER} />
          <input type="hidden" name="redirectUrl" value="booking" />
          <ProviderButtons />
        </Form>

        <BookingGrid cols={2}>
          <div className="space-y-2">
            <BookingButton
              type="button"
              size="lg"
              fullWidth
              variant="primary"
              onClick={goToSignIn}
              className="justify-start gap-3"
            >
              <LogIn className="size-5" />
              Logg inn
            </BookingButton>
            <p className="text-xs text-muted-foreground md:text-sm">Fortsett med en eksisterende konto.</p>
          </div>
          <div className="space-y-2">
            <BookingButton
              type="button"
              size="lg"
              fullWidth
              variant="outline"
              onClick={goToSignUp}
              className="justify-start gap-3"
            >
              <UserPlus className="size-5" />
              Opprett konto
            </BookingButton>
            <p className="text-xs text-muted-foreground md:text-sm">Ny her? Lag en konto på et minutt.</p>
          </div>
        </BookingGrid>
      </BookingSection>
    </>
  );
}
