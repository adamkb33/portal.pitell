import { data, useFetcher, redirect } from 'react-router';
import type { Route } from './+types/booking.public.appointment.session.contact.verify-mobile.route';
import { Button } from '@/components/ui/button';
import { VerificationCodeInput } from '@/components/ui/verification-code-input';
import { BookingErrorBanner, BookingSection, BookingStepHeader } from '../../../_components/booking-layout';
import { API_ROUTES_MAP, ROUTES_MAP } from '~/lib/route-tree';
import { resolveErrorPayload } from '~/lib/api-error';
import type { action as resendVerificationMobileAction } from '~/routes/api/auth/resend-verification/mobile/auth.resend-verification.mobile.api-route';
import type { action as verifyMobileAction } from '~/routes/api/auth/verify-mobile/auth.verify-mobile.api-route';
import { redirectAuthStatusNextStepHref } from '../_utils/auth.utils';
import React from 'react';
import { redirectWithError } from '~/routes/company/_lib/flash-message.server';

const CODE_LENGTH = 6;

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const { AppointmentSessionService } = await import('../../_services/appointment-session.service.server');
    const { ContactAuthService } = await import('../_services/contact-auth.service.server');
    const { VerificationTokenService } = await import('../_services/verification-token.service.server');
    const session = await AppointmentSessionService.get(request);

    if (!session || !session.userId) {
      console.info('[verify-mobile] redirect: missing session or userId', {
        hasSession: Boolean(session),
        userId: session?.userId ?? null,
      });
      return redirect(ROUTES_MAP['booking.public.appointment.session'].href);
    }

    const authStatus = await ContactAuthService.getUserStatus(request);
    if (!authStatus) {
      console.info('[verify-mobile] redirect: missing auth status data', {
        userId: session.userId,
      });
      return redirect(ROUTES_MAP['booking.public.appointment.session'].href);
    }

    const verificationSessionToken = await VerificationTokenService.readVerificationToken(request);
    if (!verificationSessionToken) {
      console.info('[verify-mobile] redirect: missing verification token cookie', {
        userId: session.userId,
      });
      return redirect(ROUTES_MAP['booking.public.appointment.session.contact'].href);
    }

    if (authStatus.nextStep !== 'VERIFY_MOBILE') {
      console.info('[verify-mobile] redirect: nextStep is not VERIFY_MOBILE', {
        userId: session.userId,
        nextStep: authStatus.nextStep,
      });
      return redirectAuthStatusNextStepHref(authStatus);
    }

    return data({
      session,
      authStatus,
      verificationSessionToken,
    });
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente brukerdata');
    console.error('[verify-mobile] redirect: loader error', { message });
    return redirectWithError(request, ROUTES_MAP['booking.public.appointment.session'].href, message);
  }
}

export default function BookingPublicAppointmentSessionContactAuthVerifyMobileRoute({
  loaderData,
}: Route.ComponentProps) {
  const fetcher = useFetcher<typeof verifyMobileAction>();
  const resendFetcher = useFetcher<typeof resendVerificationMobileAction>();
  const [code, setCode] = React.useState('');
  const verificationSessionToken = loaderData.verificationSessionToken;
  const errorMessage =
    typeof fetcher.data === 'object' && fetcher.data && 'error' in fetcher.data ? fetcher.data.error : null;
  const resendMessage =
    typeof resendFetcher.data === 'object' && resendFetcher.data && 'message' in resendFetcher.data
      ? String(resendFetcher.data.message)
      : null;
  const resendError =
    typeof resendFetcher.data === 'object' && resendFetcher.data && 'error' in resendFetcher.data
      ? String(resendFetcher.data.error)
      : null;

  return (
    <>
      <BookingStepHeader
        label="Kontakt"
        title="Bekreft mobil"
        description="Skriv inn koden vi har sendt på SMS for å bekrefte mobilnummeret."
      />
      <BookingSection title="Bekreft kode" variant="elevated">
        {errorMessage ? <BookingErrorBanner title={String(errorMessage)} /> : null}
        {resendError ? <BookingErrorBanner title={String(resendError)} /> : null}
        {resendMessage ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {resendMessage}
          </div>
        ) : null}
        <fetcher.Form method="post" action={API_ROUTES_MAP['auth.verify-mobile'].url} className="space-y-4">
          <div className="space-y-2">
            <input type="hidden" name="verificationSessionToken" value={verificationSessionToken} />
            <VerificationCodeInput
              name="code"
              value={code}
              onChange={setCode}
              length={CODE_LENGTH}
              aria-invalid={Boolean(errorMessage)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={code.length !== CODE_LENGTH}>
            Bekreft kode
          </Button>
        </fetcher.Form>
        <div className="space-y-2 pt-3">
          <resendFetcher.Form
            method="post"
            action={API_ROUTES_MAP['auth.resend-verification.mobile'].url}
            className="space-y-2"
          >
            <input type="hidden" name="verificationSessionToken" value={verificationSessionToken} />
            <Button
              type="submit"
              className="w-full"
              variant="secondary"
              disabled={!verificationSessionToken || resendFetcher.state !== 'idle'}
            >
              Send SMS på nytt
            </Button>
          </resendFetcher.Form>
        </div>
      </BookingSection>
    </>
  );
}
