import { data, Form, redirect, useNavigation } from 'react-router';
import type { Route } from './+types/booking.public.appointment.session.contact.sign-up.route';
import { ROUTES_MAP } from '~/lib/route-tree';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  BookingButton,
  BookingErrorBanner,
  BookingSection,
  BookingStepHeader,
} from '../../../_components/booking-layout';
import { UserPlus } from 'lucide-react';
import { redirectWithError, redirectWithInfo } from '~/routes/company/_lib/flash-message.server';
import { resolveErrorPayload } from '~/lib/api-error';
import { authService } from '~/lib/auth-service';
import { accessTokenCookie, refreshTokenCookie } from '~/routes/auth/_features/auth.cookies.server';
import { resolveAuthNextStepHref } from '../_utils/auth.utils';

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
  return data({ session });
}

export async function action({ request }: Route.ActionArgs) {
  const { AppointmentSessionService } = await import('../../_services/appointment-session.service.server');
  const { ContactAuthService } = await import('../_services/contact-auth.service.server');
  const formData = await request.formData();
  const givenName = String(formData.get('givenName') || '');
  const familyName = String(formData.get('familyName') || '');
  const email = String(formData.get('email') || '');
  const password = String(formData.get('password') || '');
  const password2 = String(formData.get('password2') || '');
  const mobileNumber = String(formData.get('mobileNumber') || '');
  const redirectUrl = String(formData.get('redirectUrl') || '');

  try {
    const response = await ContactAuthService.signUp({
      givenName,
      familyName,
      email,
      password,
      password2,
      mobileNumber,
      redirectUrl,
    });

    const session = await AppointmentSessionService.get(request);
    if (!session) {
      return redirectWithError(
        request,
        ROUTES_MAP['booking.public.appointment.session'].href,
        '[sign-up] Kunne ikke hente session',
      );
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

    if (!response) {
      return data({ error: 'Kunne ikke opprette konto. Prøv igjen.' }, { status: 400 });
    }

    const setPendingUserResponse = await ContactAuthService.setPendingSessionUser(session.sessionId, response.userId);

    if (!setPendingUserResponse) {
      return data({ error: 'Kunne ikke knytte brukeren til økten. Prøv igjen.' }, { status: 400 });
    }
    if (response?.nextStep === 'SIGN_IN') {
      const auth = await authService.getAuth(request);

      if (auth) {
        return redirectWithInfo(
          request,
          `${ROUTES_MAP['booking.public.appointment.session.employee'].href}`,
          'Du er allerede logget inn.',
        );
      }

      return redirectWithInfo(
        request,
        `${ROUTES_MAP['booking.public.appointment.session.contact.sign-in'].href}?email=${email}`,
        'Konto finnes allerede, logg inn for å fortsette.',
      );
    }

    const { verificationCookieHeader } = await ContactAuthService.resolvePostAuthRedirect(response);
    if (verificationCookieHeader) {
      headers.append('Set-Cookie', verificationCookieHeader);
    }

    const nextStepHref = resolveAuthNextStepHref(response.nextStep);
    if (nextStepHref) {
      return redirect(nextStepHref, { headers });
    }

    return redirectWithInfo(
      request,
      ROUTES_MAP['booking.public.appointment.session.contact'].href,
      'Kunne ikke opprette konto. Prøv igjen.',
      headers,
    );
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke opprette konto. Prøv igjen.');
    return data({ error: message }, { status: status ?? 400 });
  }
}

export default function BookingPublicAppointmentSessionContactSignUpRoute({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <>
      <BookingStepHeader
        label="Kontakt"
        title="Opprett konto"
        description="Opprett en konto for å fortsette booking."
      />

      <BookingSection title="Opprett konto" variant="elevated">
        <Form method="post" className="space-y-4 md:space-y-5" aria-busy={isSubmitting}>
          {actionData && 'error' in actionData && <BookingErrorBanner title={actionData.error} />}
          <input type="hidden" name="redirectUrl" value="booking" />

          <div className="grid gap-4 md:grid-cols-2 md:gap-5">
            <div className="space-y-2">
              <Label htmlFor="givenName" className="text-sm font-medium text-form-text md:text-base">
                Fornavn
              </Label>
              <Input
                id="givenName"
                name="givenName"
                autoComplete="given-name"
                required
                disabled={isSubmitting}
                className="h-12 bg-form-bg border-form-border text-base placeholder:text-form-text-muted focus:border-form-ring focus:ring-form-ring md:h-11"
                placeholder="Fornavn"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="familyName" className="text-sm font-medium text-form-text md:text-base">
                Etternavn
              </Label>
              <Input
                id="familyName"
                name="familyName"
                autoComplete="family-name"
                required
                disabled={isSubmitting}
                className="h-12 bg-form-bg border-form-border text-base placeholder:text-form-text-muted focus:border-form-ring focus:ring-form-ring md:h-11"
                placeholder="Etternavn"
              />
            </div>
          </div>

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
              required
              disabled={isSubmitting}
              className="h-12 bg-form-bg border-form-border text-base placeholder:text-form-text-muted focus:border-form-ring focus:ring-form-ring md:h-11"
              placeholder="E-post"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobileNumber" className="text-sm font-medium text-form-text md:text-base">
              Mobilnummer
            </Label>
            <Input
              id="mobileNumber"
              name="mobileNumber"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              disabled={isSubmitting}
              className="h-12 bg-form-bg border-form-border text-base placeholder:text-form-text-muted focus:border-form-ring focus:ring-form-ring md:h-11"
              placeholder="Mobilnummer"
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
              autoComplete="new-password"
              required
              disabled={isSubmitting}
              className="h-12 bg-form-bg border-form-border text-base placeholder:text-form-text-muted focus:border-form-ring focus:ring-form-ring md:h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password2" className="text-sm font-medium text-form-text md:text-base">
              Bekreft passord
            </Label>
            <Input
              id="password2"
              name="password2"
              type="password"
              autoComplete="new-password"
              required
              disabled={isSubmitting}
              className="h-12 bg-form-bg border-form-border text-base placeholder:text-form-text-muted focus:border-form-ring focus:ring-form-ring md:h-11"
            />
          </div>

          <div className="pt-2">
            <BookingButton type="submit" size="lg" fullWidth variant="primary" className="justify-start gap-3">
              <UserPlus className="size-5" />
              Opprett konto
            </BookingButton>
          </div>
        </Form>
      </BookingSection>
    </>
  );
}
