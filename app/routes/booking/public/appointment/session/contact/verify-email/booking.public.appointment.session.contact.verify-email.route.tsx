import * as React from 'react';
import { data, useFetcher, useLocation, useNavigate, redirect } from 'react-router';
import type { Route } from './+types/booking.public.appointment.session.contact.verify-email.route';
import { CheckCircle2, Loader2, Mail, MailCheck } from 'lucide-react';
import {
  BookingButton,
  BookingErrorBanner,
  BookingSection,
  BookingStepHeader,
  BookingStepList,
} from '../../../_components/booking-layout';
import { API_ROUTES_MAP, ROUTES_MAP } from '~/lib/route-tree';
import { resolveErrorPayload } from '~/lib/api-error';
import type { loader as userStatusLoader } from '~/routes/api/auth/user-status/auth.user-status.api-route';
import type { action as resendVerificationAction } from '~/routes/api/auth/resend-verification/email/auth.resend-verification.email.api-route';
import {
  redirectAuthStatusNextStepHref,
  resolveAuthNextStepHref,
} from '../_utils/auth.utils';
import { redirectWithError } from '~/routes/company/_lib/flash-message.server';

export const handle = {
  contactFlow: true,
} as const;

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const { AppointmentSessionService } = await import('../../_services/appointment-session.service.server');
    const { ContactAuthService } = await import('../_services/contact-auth.service.server');
    const { VerificationTokenService } = await import('../_services/verification-token.service.server');
    const session = await AppointmentSessionService.get(request);

    if (!session || !session.userId) {
      return redirect(ROUTES_MAP['booking.public.appointment.session'].href);
    }

    const authStatus = await ContactAuthService.getUserStatus(request);
    if (!authStatus) {
      return redirect(ROUTES_MAP['booking.public.appointment.session'].href);
    }

    const verificationSessionToken = await VerificationTokenService.readVerificationToken(request);
    if (!verificationSessionToken) {
      return redirect(ROUTES_MAP['booking.public.appointment.session.contact'].href);
    }

    if (authStatus.nextStep !== 'VERIFY_EMAIL') {
      return redirectAuthStatusNextStepHref(authStatus);
    }

    return data({
      session,
      authStatus,
      verificationSessionToken,
    });
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente brukerdata');
    return redirectWithError(request, ROUTES_MAP['booking.public.appointment.session'].href, message);
  }
}
export default function BookingPublicAppointmentSessionContactAuthVerifyEmailRoute({
  loaderData,
}: Route.ComponentProps) {
  const email = loaderData.authStatus.user?.email ?? '';
  const userId = loaderData.session?.userId;
  const statusFetcher = useFetcher<typeof userStatusLoader>();
  const resendFetcher = useFetcher<typeof resendVerificationAction>();
  type StatusFetcherData = typeof statusFetcher.data;
  const navigate = useNavigate();
  const location = useLocation();
  const didNavigateRef = React.useRef(false);
  const redirectHint = React.useMemo(() => new URLSearchParams(location.search).get('redirectUrl'), [location.search]);

  const resendError =
    typeof resendFetcher.data === 'object' && resendFetcher.data && 'error' in resendFetcher.data
      ? String(resendFetcher.data.error)
      : null;
  const resendSuccess =
    typeof resendFetcher.data === 'object' && resendFetcher.data && 'message' in resendFetcher.data
      ? String(resendFetcher.data.message)
      : null;

  const statusFetcherError =
    typeof statusFetcher.data === 'object' && statusFetcher.data && 'error' in statusFetcher.data
      ? String(statusFetcher.data.error)
      : null;
  const errorCountRef = React.useRef(0);

  // Preserve companyId from URL
  const companyIdParam = React.useMemo(() => {
    return new URLSearchParams(location.search).get('companyId');
  }, [location.search]);

  React.useEffect(() => {
    if (!userId) return;

    const interval = window.setInterval(() => {
      // Stop polling after 5 consecutive errors
      if (errorCountRef.current >= 5) {
        console.warn('[verify-email] Stopped polling due to repeated errors');
        return;
      }

      if (statusFetcher.state !== 'idle') return;
      const params = new URLSearchParams({ userId: String(userId) });
      statusFetcher.load(`${API_ROUTES_MAP['auth.user-status'].url}?${params.toString()}`);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [statusFetcher, userId]);

  // Track errors and stop polling if too many
  React.useEffect(() => {
    if (statusFetcherError) {
      errorCountRef.current += 1;
    } else if (statusFetcher.data && typeof statusFetcher.data === 'object' && !('error' in statusFetcher.data)) {
      errorCountRef.current = 0; // Reset on success
    }
  }, [statusFetcher.data, statusFetcherError]);

  React.useEffect(() => {
    if (typeof statusFetcher.data === 'undefined') return;
    if (didNavigateRef.current || typeof window === 'undefined') return;

    const data = statusFetcher.data as StatusFetcherData;

    // Check if user has moved to a different step (email verified)
    if (data && typeof data === 'object' && 'nextStep' in data && data.nextStep && data.nextStep !== 'VERIFY_EMAIL') {
      const nextStepHref = resolveAuthNextStepHref(data.nextStep);

      if (nextStepHref) {
        didNavigateRef.current = true;
        // Preserve companyId in URL
        const targetUrl = companyIdParam ? `${nextStepHref}?companyId=${companyIdParam}` : nextStepHref;
        console.log('[verify-email] Email verified, navigating to:', targetUrl);
        navigate(targetUrl, { replace: true });
      }
    }
  }, [statusFetcher.data, companyIdParam, navigate]);

  return (
    <>
      <BookingStepHeader
        label="Kontakt"
        title="Bekreft e-post"
        description="Klikk på lenken i e-posten for å fullføre verifiseringen."
      />
      {redirectHint === 'booking' ? (
        <div className="rounded-lg border border-card-border bg-card p-3 text-sm text-card-text">
          Du kan nå fortsette med bookingen. Gå tilbake til bookingsteget for å fullføre.
        </div>
      ) : null}
      <BookingSection title="Venter på verifisering" variant="elevated">
        <div className="space-y-4">
          {statusFetcherError && errorCountRef.current >= 3 ? (
            <BookingErrorBanner title="Kunne ikke sjekke verifiseringsstatus automatisk" />
          ) : null}
          {resendError ? <BookingErrorBanner title={resendError} /> : null}
          {resendSuccess ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              {resendSuccess}
            </div>
          ) : null}
          <div className="relative overflow-hidden rounded-lg border border-card-border bg-card p-4 md:p-5">
            <div className="absolute right-0 top-0 size-28 -translate-y-8 translate-x-8 rounded-full bg-primary/10 blur-2xl" />
            <div className="relative flex items-start gap-3">
              <Loader2 className="size-10 animate-spin text-primary" />
              <div className="space-y-1">
                <p className="text-base font-semibold text-card-text md:text-lg">Vi venter på bekreftelse</p>
                <p className="text-sm text-muted-foreground md:text-base">
                  Når du bekrefter e-posten, tar vi deg videre automatisk.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-card-border bg-background p-3 md:p-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Mail className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-card-text">E-post sendt</p>
                <p className="text-sm text-muted-foreground">
                  {email ? `Sjekk innboksen til ${email}.` : 'Sjekk innboksen din for verifiseringslenken.'}
                </p>
              </div>
            </div>
          </div>

          <BookingStepList
            steps={[
              {
                title: 'Åpne e-posten og klikk på lenken',
                description: 'Bekreft e-postadressen din for å fortsette.',
                icon: <Mail className="size-4 text-primary-foreground" />,
              },
              {
                title: 'Kom tilbake hit',
                description: 'Vi sjekker status automatisk og sender deg videre.',
                icon: <CheckCircle2 className="size-4 text-primary-foreground" />,
              },
            ]}
          />

          <div className="space-y-2">
            <resendFetcher.Form
              method="post"
              action={API_ROUTES_MAP['auth.resend-verification.email'].url}
              className="space-y-2"
            >
              <input type="hidden" name="redirectUrl" value="booking" />
              <input type="hidden" name="email" value={email} />
              <input type="hidden" name="sendEmail" value="true" />
              <input type="hidden" name="sendMobile" value="false" />
              <BookingButton
                type="submit"
                size="lg"
                fullWidth
                variant="secondary"
                className="justify-start gap-3"
                loading={resendFetcher.state !== 'idle'}
                disabled={!email}
              >
                <MailCheck className="size-5" />
                Send e-posten på nytt
              </BookingButton>
            </resendFetcher.Form>
          </div>
        </div>
      </BookingSection>
    </>
  );
}
