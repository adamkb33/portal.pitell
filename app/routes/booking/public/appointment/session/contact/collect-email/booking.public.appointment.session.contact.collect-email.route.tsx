import { data, Form, redirect, useNavigation } from 'react-router';
import type { Route } from './+types/booking.public.appointment.session.contact.collect-email.route';
import { Input } from '@/components/ui/input';
import { Mail } from 'lucide-react';
import { ROUTES_MAP } from '~/lib/route-tree';
import { resolveErrorPayload } from '~/lib/api-error';
import { redirectWithError, redirectWithInfo } from '~/routes/company/_lib/flash-message.server';
import {
  BookingButton,
  BookingErrorBanner,
  BookingSection,
  BookingStepHeader,
} from '../../../_components/booking-layout';
import { resolveAuthNextStepHref } from '../_utils/auth.utils';

export async function loader({ request }: Route.LoaderArgs) {
  const { AppointmentSessionService } = await import('../../_services/appointment-session.service.server');
  const session = await AppointmentSessionService.get(request);

  if (!session) {
    return redirectWithError(request, ROUTES_MAP['booking.public.appointment'].href, 'Kunne ikke hente session');
  }

  return data({ session });
}

export async function action({ request }: Route.ActionArgs) {
  try {
    const { AppointmentSessionService } = await import('../../_services/appointment-session.service.server');
    const { ContactAuthService } = await import('../_services/contact-auth.service.server');
    const session = await AppointmentSessionService.get(request);

    if (!session) {
      return redirectWithError(request, ROUTES_MAP['booking.public.appointment'].href, 'Kunne ikke hente session');
    }

    if (!session.userId) {
      return redirectWithError(request, ROUTES_MAP['booking.public.appointment'].href, 'Kunne ikke hente bruker-ID');
    }

    const formData = await request.formData();
    const email = String(formData.get('email') || '');

    const response = await ContactAuthService.completeProfile({
      userId: session.userId,
      email,
    });

    const { nextStepHref, verificationCookieHeader } = await ContactAuthService.resolvePostAuthRedirect(response);
    if (verificationCookieHeader) {
      const headers = new Headers();
      headers.append('Set-Cookie', verificationCookieHeader);

      if (nextStepHref) {
        return redirect(nextStepHref, { headers });
      }

      return redirectWithInfo(
        request,
        ROUTES_MAP['booking.public.appointment.session.contact'].href,
        'Kunne ikke logge inn. Prøv igjen.',
        headers,
      );
    }

    if (!response) {
      return redirectWithError(request, ROUTES_MAP['booking.public.appointment'].href, 'Kunne ikke lagre e-post.');
    }

    const resolveNextStepHref = resolveAuthNextStepHref(response?.nextStep);
    if (resolveNextStepHref) {
      return redirect(resolveNextStepHref);
    }

    return redirectWithError(request, ROUTES_MAP['booking.public.appointment'].href, 'Kunne ikke lagre e-post.');
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke lagre e-post. Prøv igjen.');
    return data({ error: message }, { status: status ?? 400 });
  }
}

export default function BookingPublicAppointmentSessionContactAuthCollectEmailRoute({
  actionData,
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const errorMessage = typeof actionData === 'object' && actionData && 'error' in actionData ? actionData.error : null;
  return (
    <>
      <BookingStepHeader
        label="Kontakt"
        title="Legg til din e-post"
        description="Vi trenger e-posten din for å fullføre booking."
      />

      {errorMessage ? <BookingErrorBanner title={String(errorMessage)} /> : null}

      <BookingSection title="E-post" variant="elevated">
        <Form method="post" className="space-y-4 md:space-y-5" aria-busy={isSubmitting}>
          <div className="space-y-2">
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              disabled={isSubmitting}
              className="h-12 border-form-border bg-form-bg text-base placeholder:text-form-text-muted focus:border-form-ring focus:ring-form-ring md:h-11"
            />
          </div>

          <div className="pt-2">
            <BookingButton type="submit" size="lg" fullWidth variant="primary" className="justify-start gap-3">
              <Mail className="size-5" />
              Fortsett
            </BookingButton>
          </div>
        </Form>
      </BookingSection>
    </>
  );
}
