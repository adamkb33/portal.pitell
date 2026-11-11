import * as React from 'react';
import { Form, data, redirect, useActionData, useNavigation } from 'react-router';
import { Check, CircleAlert, RotateCcw } from 'lucide-react';
import { Booking, PublicAppointmentSessionController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { authService } from '~/lib/auth-service';
import { redirectWithError } from '~/lib/flash-message.server';
import { BookingActionButton } from '~/routes/booking/public/_components/booking-action-button';
import { BookingFooterNav } from '~/routes/booking/public/_components/booking-footer-nav';
import { withBookingBackendCall, withBookingFlowLog } from '~/routes/booking/public/_utils/booking-flow-log.server';
import { requireBookingSession } from '~/routes/booking/public/_utils/booking.require-authenticated-flow.server';
import { getBookingRouteMap } from '~/routes/booking/public/_utils/booking.route-map';
import { useBookingCompanyName } from '~/routes/booking/public/_utils/use-booking-company-name';
import { BookingStepTemplate, Button, VerificationCodeInput } from '~/ui';
import { mobileVerificationTokenCookie } from '../_utils/mobile-verification-token.cookie.server';
import { describeSmsCodeError, formatShortWait, readRetryAfterSeconds } from './_utils/sms-code-message';
import type { Route } from './+types/booking.public.appointment.session.contact.verify-mobile.route';

type VerifyMobileActionData =
  | {
      ok: false;
      error: string;
      /** Set when the backend says how long until a new code can be sent. */
      retryAfterSeconds?: number;
    }
  | {
      ok: true;
      message: string;
    };

const CODE_LENGTH = 6;
const ROUTE_ID = 'booking.public.appointment.session.contact.verify-mobile';

export async function loader({ request }: Route.LoaderArgs) {
  return withBookingFlowLog({ request, routeId: ROUTE_ID, kind: 'loader', step: 'verify-mobile' }, async () => {
    const routes = getBookingRouteMap();
    const url = new URL(request.url);

    try {
      const guardResult = await requireBookingSession(request);
      if (guardResult instanceof Response) {
        return guardResult;
      }

      const { session } = guardResult;
      const requirementsResponse = await withBookingBackendCall(
        { request, routeId: ROUTE_ID, step: 'verify-mobile', call: 'get-requirements', session },
        () =>
          withAuth(request, () =>
            PublicAppointmentSessionController.getAppointmentSessionRequirements({
              path: { sessionId: session.sessionId },
            }),
          ),
      );
      const requirements = requirementsResponse.data?.data;

      if (!requirements || requirements.nextStep === 'CONTACT_FORM') {
        return redirect(routes.contact);
      }

      if (requirements.nextStep === 'DONE') {
        return redirect(routes.overview);
      }

      if (!requirements.challengeId) {
        return redirectWithError(request, routes.contact, 'Skriv inn mobilnummeret ditt på nytt.');
      }

      // Counted on the server so the browser's clock can't make the countdown wrong.
      const resendInSeconds = requirements.resendAvailableAt
        ? Math.max(0, Math.ceil((Date.parse(requirements.resendAvailableAt) - Date.now()) / 1000))
        : 0;

      return data({
        session,
        requirements,
        resendInSeconds,
        isReplacingContact: url.searchParams.get('replacement') === '1' && Boolean(requirements.userId),
      });
    } catch (error) {
      const { message } = resolveErrorPayload(error, 'Kunne ikke hente SMS-verifisering');
      return redirectWithError(request, routes.contact, message);
    }
  });
}

export async function action({ request }: Route.ActionArgs) {
  return withBookingFlowLog({ request, routeId: ROUTE_ID, kind: 'action', step: 'verify-mobile' }, async () => {
    const routes = getBookingRouteMap();

    const guardResult = await requireBookingSession(request);
    if (guardResult instanceof Response) {
      return guardResult;
    }

    const { session } = guardResult;
    const formData = await request.formData();
    const intent = String(formData.get('intent') || 'verify');
    const isReplacingContact = formData.get('replacement') === '1';

    if (intent === 'change-mobile' || intent === 'cancel-replacement') {
      try {
        await withBookingBackendCall(
          { request, routeId: ROUTE_ID, step: 'verify-mobile', call: 'cancel-contact-replacement', session },
          () =>
            withAuth(request, () =>
              Booking.cancelAppointmentSessionContactReplacement({
                path: { sessionId: session.sessionId },
              }),
            ),
        );
        if (intent === 'cancel-replacement') return redirect(routes.overview);

        return redirect(isReplacingContact ? `${routes.contact}?edit=1` : `${routes.contact}?form=1`);
      } catch (error) {
        const { message } = resolveErrorPayload(error, 'Kunne ikke avbryte kontaktendringen');
        return data<VerifyMobileActionData>({ ok: false, error: message }, { status: 400 });
      }
    }

    if (intent === 'resend') {
      try {
        await withBookingBackendCall(
          { request, routeId: ROUTE_ID, step: 'verify-mobile', call: 'resend-mobile-challenge', session },
          () =>
            withAuth(request, () =>
              PublicAppointmentSessionController.resendAppointmentSessionMobileChallenge({
                path: { sessionId: session.sessionId },
              }),
            ),
        );
        return data<VerifyMobileActionData>({ ok: true, message: 'Ny kode sendt.' });
      } catch (error) {
        const payload = resolveErrorPayload(error, 'Kunne ikke sende ny kode. Prøv igjen.');
        return data<VerifyMobileActionData>(
          { ok: false, error: describeSmsCodeError(payload), retryAfterSeconds: readRetryAfterSeconds(payload) },
          { status: 400 },
        );
      }
    }

    // Default: verify the code.
    try {
      const challengeId = String(formData.get('challengeId') || '');
      const code = String(formData.get('code') || '').replace(/\D/g, '');

      if (!challengeId || code.length !== CODE_LENGTH) {
        return data<VerifyMobileActionData>({ ok: false, error: 'Skriv inn SMS-koden på 6 siffer.' }, { status: 400 });
      }

      const response = await withBookingBackendCall(
        {
          request,
          routeId: ROUTE_ID,
          step: 'verify-mobile',
          call: 'verify-mobile',
          session,
          context: { hasChallengeId: Boolean(challengeId) },
        },
        () =>
          withAuth(request, () =>
            PublicAppointmentSessionController.verifyAppointmentSessionUserMobile({
              path: { sessionId: session.sessionId },
              body: {
                challengeId,
                code,
              },
            }),
          ),
      );
      const payload = response.data?.data;

      if (!payload || payload.nextStep !== 'DONE') {
        return data<VerifyMobileActionData>(
          { ok: false, error: 'Mobilnummeret ble ikke bekreftet. Prøv igjen.' },
          { status: 400 },
        );
      }

      const headers = await authService.setAuthCookies(
        payload.authTokens.accessToken,
        payload.authTokens.refreshToken,
        payload.authTokens.accessTokenExpiresAt,
        payload.authTokens.refreshTokenExpiresAt,
      );

      if (payload.mobileVerificationToken && payload.mobileVerificationTokenExpiresAt) {
        headers.append(
          'Set-Cookie',
          await mobileVerificationTokenCookie.serialize(payload.mobileVerificationToken, {
            expires: new Date(payload.mobileVerificationTokenExpiresAt),
          }),
        );
      }

      return redirect(routes.overview, { headers });
    } catch (error) {
      const payload = resolveErrorPayload(error, 'Kunne ikke bekrefte koden. Prøv igjen.');
      return data<VerifyMobileActionData>({ ok: false, error: describeSmsCodeError(payload) }, { status: 400 });
    }
  });
}

export default function BookingContactVerifyMobilePage({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<typeof action>() as VerifyMobileActionData | undefined;
  const navigation = useNavigation();
  const companyName = useBookingCompanyName();
  const [code, setCode] = React.useState('');
  const isSubmitting = navigation.state !== 'idle';
  const submittingIntent = navigation.formData?.get('intent');
  const isVerifyingCode = isSubmitting && submittingIntent === 'verify';
  const isSendingCode = isSubmitting && submittingIntent === 'resend';
  const isChangingMobile = isSubmitting && submittingIntent === 'change-mobile';
  const isCancellingReplacement = isSubmitting && submittingIntent === 'cancel-replacement';
  const maskedMobile = loaderData.requirements.maskedMobile || 'mobilnummeret ditt';
  const resendWaitSeconds =
    (actionData?.ok === false ? actionData.retryAfterSeconds : undefined) ?? loaderData.resendInSeconds;
  const resendInSeconds = useSecondsLeft(resendWaitSeconds, actionData ?? loaderData);

  return (
    <BookingStepTemplate label={companyName} title="Skriv inn SMS-koden" description={`Sendt til ${maskedMobile}.`}>
      {/* THE verify form — wraps the card AND the footer, so no form="id" indirection. */}
      <Form method="post" aria-busy={isVerifyingCode} className="space-y-4">
        {/* Pressing Enter submits with the first submit button in the form. Without this,
              that is "Send SMS på nytt", so Enter would request a new code instead of verifying.
              Visually hidden rather than display:none so Safari still treats it as the default. */}
        <button
          type="submit"
          name="intent"
          value="verify"
          disabled={code.length !== CODE_LENGTH || isSubmitting}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        />
        <input type="hidden" name="challengeId" value={loaderData.requirements.challengeId} />
        {loaderData.isReplacingContact ? <input type="hidden" name="replacement" value="1" /> : null}

        <div className="space-y-4 rounded-[var(--radius-booking-panel)] border-[length:var(--border-booking-card)] border-booking-border bg-booking-surface-raised p-4 shadow-[var(--shadow-booking-card)]">
          <VerificationCodeInput
            name="code"
            aria-label="Engangskode"
            value={code}
            onChange={setCode}
            length={CODE_LENGTH}
            aria-invalid={actionData?.ok === false}
            aria-describedby={actionData?.ok === false ? 'code-error' : undefined}
            disabled={isSubmitting}
            className="border-booking-border bg-booking-surface-strong text-booking-text focus:border-booking-action focus:ring-booking-action/25"
          />

          {actionData ? <CodeMessage result={actionData} /> : null}

          <div className="border-t border-booking-border pt-4">
            <ResendButton isSendingCode={isSendingCode} isSubmitting={isSubmitting} resendInSeconds={resendInSeconds} />
          </div>
        </div>

        <BookingFooterNav>
          {loaderData.isReplacingContact ? (
            <BookingActionButton
              type="submit"
              name="intent"
              value="cancel-replacement"
              variant="secondary"
              loading={isCancellingReplacement}
              disabled={isSubmitting}
            >
              Avbryt endring
            </BookingActionButton>
          ) : (
            <BookingActionButton
              type="submit"
              name="intent"
              value="change-mobile"
              variant="secondary"
              loading={isChangingMobile}
              disabled={isSubmitting}
            >
              Tilbake
            </BookingActionButton>
          )}
          <BookingActionButton
            type="submit"
            name="intent"
            value="verify"
            variant="primary"
            loading={isVerifyingCode}
            disabled={code.length !== CODE_LENGTH || isSubmitting}
          >
            {isVerifyingCode ? 'Bekrefter ...' : 'Bekreft mobilnummer'}
          </BookingActionButton>
        </BookingFooterNav>
      </Form>
    </BookingStepTemplate>
  );
}

/**
 * The clicked submit button supplies the intent. The primary button sends `verify`,
 * while this secondary button sends `resend` through the same form.
 */
function ResendButton({
  isSendingCode,
  isSubmitting,
  resendInSeconds,
}: {
  isSendingCode: boolean;
  isSubmitting: boolean;
  resendInSeconds: number;
}) {
  return (
    <Button
      type="submit"
      name="intent"
      value="resend"
      variant="booking-secondary"
      loading={isSendingCode}
      disabled={isSubmitting || resendInSeconds > 0}
    >
      <RotateCcw className="size-4" />
      {isSendingCode
        ? 'Sender ny kode ...'
        : resendInSeconds > 0
          ? `Send ny kode om ${formatShortWait(resendInSeconds)}`
          : 'Send ny kode'}
    </Button>
  );
}

/** One line under the code: what went wrong and what to do, or that a new code is on its way. */
function CodeMessage({ result }: { result: VerifyMobileActionData }) {
  if (result.ok) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-booking-text-muted">
        <Check className="size-4 shrink-0 text-success" aria-hidden="true" />
        {result.message}
      </p>
    );
  }

  return (
    <p
      id="code-error"
      role="alert"
      className="flex items-start gap-2 rounded-[var(--radius-booking-control)] bg-danger-soft px-3 py-2.5 text-sm font-medium text-red-700"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {result.error}
    </p>
  );
}

/** Counts [seconds] down to zero, starting over whenever the server sends a new wait. */
function useSecondsLeft(seconds: number, restartKey: unknown) {
  const [secondsLeft, setSecondsLeft] = React.useState(seconds);

  React.useEffect(() => {
    const deadline = Date.now() + seconds * 1000;
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    if (seconds <= 0) return;

    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [seconds, restartKey]);

  return secondsLeft;
}
