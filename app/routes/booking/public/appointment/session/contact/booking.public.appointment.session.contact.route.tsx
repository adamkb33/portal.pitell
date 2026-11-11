import { useState } from 'react';
import { Form, data, redirect, useNavigation } from 'react-router';
import { Mail, Phone, Plus } from 'lucide-react';
import { Booking, PublicAppointmentSessionController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { authService } from '~/lib/auth-service';
import { redirectWithError } from '~/lib/flash-message.server';
import { logger } from '~/lib/logger';
import { BookingActionButton } from '~/routes/booking/public/_components/booking-action-button';
import { BookingFooterNav } from '~/routes/booking/public/_components/booking-footer-nav';
import { BookingLink } from '~/routes/booking/public/_components/booking-link';
import {
  getBookingSessionLogContext,
  withBookingBackendCall,
  withBookingFlowLog,
} from '~/routes/booking/public/_utils/booking-flow-log.server';
import { requireBookingSession } from '~/routes/booking/public/_utils/booking.require-authenticated-flow.server';
import { getBookingRouteMap } from '~/routes/booking/public/_utils/booking.route-map';
import { useBookingCompanyName } from '~/routes/booking/public/_utils/use-booking-company-name';
import { BookingStepTemplate, Input, Label, Notice, Text } from '~/ui';
import { submitContactFormSchema } from './_schemas/submit-contact.form.schema';
import { BOOKING_CONTACT_LABEL_CLASS } from './_utils/booking-contact-theme';
import { clearManualContactOverride, hasManualContactOverride } from './_utils/manual-contact-override.cookie.server';
import { mobileVerificationTokenCookie } from './_utils/mobile-verification-token.cookie.server';
import type { Route } from './+types/booking.public.appointment.session.contact.route';

const ROUTE_ID = 'booking.public.appointment.session.contact';
const CARD_CLASS =
  'rounded-[var(--radius-booking-panel)] border-[length:var(--border-booking-card)] border-booking-border bg-booking-surface-raised shadow-[var(--shadow-booking-card)]';

type ContactFormValues = {
  givenName: string;
  familyName: string;
  mobileNumber: string;
  email: string;
};

export async function loader({ request }: Route.LoaderArgs) {
  return withBookingFlowLog({ request, routeId: ROUTE_ID, kind: 'loader', step: 'contact' }, async () => {
    const routes = getBookingRouteMap();
    const url = new URL(request.url);

    const guardResult = await requireBookingSession(request);
    if (guardResult instanceof Response) return guardResult;
    const { session } = guardResult;

    if (!session.selectedProfileId) return redirect(routes.employee);
    if (!session.selectedServices?.length) return redirect(routes.selectServices);
    if (!session.selectedStartTime) return redirect(routes.selectTime);

    const isEditingContact = url.searchParams.get('edit') === '1';
    const manualContact =
      isEditingContact ||
      url.searchParams.get('form') === '1' ||
      (await hasManualContactOverride(request, session.sessionId));

    if (manualContact) {
      if (isEditingContact) {
        try {
          const response = await withBookingBackendCall(
            { request, routeId: ROUTE_ID, step: 'contact', call: 'get-overview-for-edit', session },
            () =>
              withAuth(request, () =>
                PublicAppointmentSessionController.getAppointmentSessionOverview({
                  query: { sessionId: session.sessionId },
                }),
              ),
          );
          const user = response.data?.data?.user;
          if (!user) {
            return redirectWithError(request, routes.overview, 'Kunne ikke hente kontaktinformasjonen');
          }

          return data({
            session,
            requirementsError: null as string | null,
            isEditingContact: true,
            initialContact: {
              givenName: user.givenName ?? '',
              familyName: user.familyName ?? '',
              mobileNumber: formatLocalMobileNumber(user.mobileNumber),
              email: user.email ?? '',
            } satisfies ContactFormValues,
          });
        } catch (error) {
          const { message } = resolveErrorPayload(error, 'Kunne ikke hente kontaktinformasjonen');
          return redirectWithError(request, routes.overview, message);
        }
      }

      return data({
        session,
        requirementsError: null as string | null,
        isEditingContact: false,
        initialContact: null as ContactFormValues | null,
      });
    }

    try {
      const requirementsResponse = await withBookingBackendCall(
        { request, routeId: ROUTE_ID, step: 'contact', call: 'get-requirements', session },
        () =>
          withAuth(request, () =>
            PublicAppointmentSessionController.getAppointmentSessionRequirements({
              path: { sessionId: session.sessionId },
            }),
          ),
      );
      const requirements = requirementsResponse.data?.data ?? null;

      if (requirements?.nextStep === 'DONE' && session.userId) {
        const response = await withBookingBackendCall(
          { request, routeId: ROUTE_ID, step: 'contact', call: 'resume-session', session },
          () =>
            withAuth(request, () =>
              PublicAppointmentSessionController.resumeAppointmentSession({
                path: { sessionId: session.sessionId },
              }),
            ),
        );
        const authTokens = response.data?.data?.authTokens;
        const headers = authTokens
          ? await authService.setAuthCookies(
              authTokens.accessToken,
              authTokens.refreshToken,
              authTokens.accessTokenExpiresAt,
              authTokens.refreshTokenExpiresAt,
            )
          : undefined;

        return redirect(routes.overview, headers ? { headers } : undefined);
      }

      if (requirements?.canAttachAuthenticatedUser) {
        try {
          const response = await withBookingBackendCall(
            { request, routeId: ROUTE_ID, step: 'contact', call: 'set-pending-user', session },
            () =>
              withAuth(request, () =>
                PublicAppointmentSessionController.setPendingAppointmentSessionUser({
                  path: { sessionId: session.sessionId },
                }),
              ),
          );
          const nextStep = response.data?.data?.nextStep;

          if (nextStep === 'DONE') return redirect(routes.overview);
          if (nextStep === 'VERIFY_MOBILE') return redirect(routes.contactVerifyMobile);

          return data({
            session,
            requirementsError: 'Vi kunne ikke bruke den innloggede kontoen. Fyll ut kontaktinformasjonen.',
            isEditingContact: false,
            initialContact: null as ContactFormValues | null,
          });
        } catch (error) {
          const { message } = resolveErrorPayload(error, 'Fyll ut kontaktinformasjonen for å fortsette.');
          logger.error('[booking:contact:loader]', {
            ...getBookingSessionLogContext(session),
            contactResolution: 'attach-failed',
            message,
          });
          return data({
            session,
            requirementsError: message,
            isEditingContact: false,
            initialContact: null as ContactFormValues | null,
          });
        }
      }

      if (requirements?.nextStep === 'VERIFY_MOBILE') {
        const challengeParam = requirements.challengeId ? `?challengeId=${requirements.challengeId}` : '';
        return redirect(`${routes.contactVerifyMobile}${challengeParam}`);
      }

      return data({
        session,
        requirementsError: null as string | null,
        isEditingContact: false,
        initialContact: null as ContactFormValues | null,
      });
    } catch (error) {
      const { message } = resolveErrorPayload(error, 'Kunne ikke hente kontaktstatus');
      logger.error('[booking:contact:loader]', {
        ...getBookingSessionLogContext(session),
        contactResolution: 'failed',
        message,
      });
      return data({
        session,
        requirementsError: message,
        isEditingContact: false,
        initialContact: null as ContactFormValues | null,
      });
    }
  });
}

export async function action({ request }: Route.ActionArgs) {
  return withBookingFlowLog({ request, routeId: ROUTE_ID, kind: 'action', step: 'contact' }, async () => {
    const routes = getBookingRouteMap();

    const guardResult = await requireBookingSession(request);
    if (guardResult instanceof Response) return guardResult;
    const { session } = guardResult;

    const formData = await request.formData();
    const intent = String(formData.get('intent') || 'identify');

    if (intent === 'cancel-edit') {
      try {
        await withBookingBackendCall(
          { request, routeId: ROUTE_ID, step: 'contact', call: 'cancel-contact-replacement', session },
          () =>
            withAuth(request, () =>
              Booking.cancelAppointmentSessionContactReplacement({
                path: { sessionId: session.sessionId },
              }),
            ),
        );
        return redirect(routes.overview, {
          headers: { 'Set-Cookie': await clearManualContactOverride() },
        });
      } catch (error) {
        const { message } = resolveErrorPayload(error, 'Kunne ikke avbryte kontaktendringen');
        return redirectWithError(request, routes.overview, message);
      }
    }

    const isReplacingContact = formData.get('replacement') === '1';

    const parsed = submitContactFormSchema.safeParse({
      companyId: session.companyId,
      givenName: String(formData.get('givenName') || '').trim(),
      familyName: String(formData.get('familyName') || '').trim(),
      mobileNumber: String(formData.get('mobileNumber') || '').trim(),
      email: String(formData.get('email') || '').trim(),
    });
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Kontroller kontaktinformasjonen og prøv igjen.';
      return data({ error: firstError }, { status: 400 });
    }

    try {
      const mobileVerificationToken = await mobileVerificationTokenCookie.parse(request.headers.get('Cookie'));
      const response = await withBookingBackendCall(
        {
          request,
          routeId: ROUTE_ID,
          step: 'contact',
          call: 'identify-user',
          session,
          context: { hasEmail: Boolean(parsed.data.email) },
        },
        () =>
          withAuth(request, () =>
            PublicAppointmentSessionController.identifyAppointmentSessionUser({
              path: { sessionId: session.sessionId },
              body: {
                givenName: parsed.data.givenName,
                familyName: parsed.data.familyName,
                mobileNumber: parsed.data.mobileNumber,
                email: parsed.data.email,
                mobileVerificationToken:
                  typeof mobileVerificationToken === 'string' ? mobileVerificationToken : undefined,
              },
            }),
          ),
      );

      const result = response.data?.data;
      logger.info('[booking:contact:action]', {
        ...getBookingSessionLogContext(session),
        intent,
        nextStep: result?.nextStep ?? null,
      });

      if (result?.nextStep === 'DONE') {
        const headers = result.authTokens
          ? await authService.setAuthCookies(
              result.authTokens.accessToken,
              result.authTokens.refreshToken,
              result.authTokens.accessTokenExpiresAt,
              result.authTokens.refreshTokenExpiresAt,
            )
          : new Headers();
        headers.append('Set-Cookie', await clearManualContactOverride());
        return redirect(routes.overview, { headers });
      }

      if (result?.nextStep === 'VERIFY_MOBILE') {
        const headers = new Headers();
        headers.append('Set-Cookie', await clearManualContactOverride());
        const searchParams = new URLSearchParams();
        if (result.challengeId) searchParams.set('challengeId', result.challengeId);
        if (isReplacingContact) searchParams.set('replacement', '1');
        const challengeParams = searchParams.size > 0 ? `?${searchParams.toString()}` : '';
        return redirect(`${routes.contactVerifyMobile}${challengeParams}`, { headers });
      }

      return data({ error: 'Kunne ikke fortsette. Kontroller kontaktinformasjonen og prøv igjen.' }, { status: 400 });
    } catch (error) {
      const { message } = resolveErrorPayload(error, 'Kunne ikke lagre kontaktinformasjon');
      return data({ error: message }, { status: 400 });
    }
  });
}

export default function BookingSessionContactPage({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== 'idle';
  const routes = getBookingRouteMap();
  const companyName = useBookingCompanyName();
  const pendingIntent = isSubmitting ? String(navigation.formData?.get('intent') ?? '') : '';
  const pendingDestination = isSubmitting
    ? `${navigation.location?.pathname ?? ''}${navigation.location?.search ?? ''}`
    : '';
  const errorMessage =
    actionData && typeof actionData === 'object' && 'error' in actionData ? String(actionData.error) : null;

  return (
    <BookingStepTemplate
      label={companyName}
      title={loaderData.isEditingContact ? 'Endre kontaktinformasjon' : 'Hvordan når vi deg?'}
    >
      {errorMessage ? (
        <Notice variant="booking" tone="emphasis" title="Kunne ikke fortsette" message={errorMessage} />
      ) : null}
      {loaderData.requirementsError ? (
        <Notice
          variant="booking"
          tone="emphasis"
          title="Fyll ut kontaktinformasjonen"
          message={loaderData.requirementsError}
        />
      ) : null}

      <ContactForm
        routes={routes}
        isSubmitting={isSubmitting}
        pendingIntent={pendingIntent}
        pendingDestination={pendingDestination}
        isEditingContact={loaderData.isEditingContact}
        initialContact={loaderData.initialContact}
      />
    </BookingStepTemplate>
  );
}

function ContactForm({
  routes,
  isSubmitting,
  pendingIntent,
  pendingDestination,
  isEditingContact,
  initialContact,
}: {
  routes: ReturnType<typeof getBookingRouteMap>;
  isSubmitting: boolean;
  pendingIntent: string;
  pendingDestination: string;
  isEditingContact: boolean;
  initialContact: ContactFormValues | null;
}) {
  const [showEmail, setShowEmail] = useState(Boolean(initialContact?.email));
  const isCancellingEdit = pendingIntent === 'cancel-edit';

  return (
    <Form method="post" className="space-y-4">
      {isEditingContact ? <input type="hidden" name="replacement" value="1" readOnly /> : null}

      <div className={`${CARD_CLASS} space-y-4 p-4`}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="givenName" className={BOOKING_CONTACT_LABEL_CLASS}>
              Fornavn
            </Label>
            <Input
              id="givenName"
              name="givenName"
              variant="booking"
              autoComplete="given-name"
              defaultValue={initialContact?.givenName}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="familyName" className={BOOKING_CONTACT_LABEL_CLASS}>
              Etternavn
            </Label>
            <Input
              id="familyName"
              name="familyName"
              variant="booking"
              autoComplete="family-name"
              defaultValue={initialContact?.familyName}
              required
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mobileNumber" className={BOOKING_CONTACT_LABEL_CLASS}>
            Mobilnummer
          </Label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-booking-text-muted" />
            <Input
              id="mobileNumber"
              name="mobileNumber"
              variant="booking"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              defaultValue={initialContact?.mobileNumber}
              maxLength={8}
              required
              disabled={isSubmitting}
              className="pl-9"
            />
          </div>
          <Text as="p" variant="caption" className="text-booking-text-muted">
            {isEditingContact
              ? 'Hvis du endrer nummeret, sender vi en kode før kontakten erstattes.'
              : 'Vi sender en kode for å bekrefte nummeret.'}
          </Text>
        </div>

        {showEmail ? (
          <div className="space-y-2">
            <Label htmlFor="email" className={BOOKING_CONTACT_LABEL_CLASS}>
              E-post <span className="font-normal text-booking-text-muted">(valgfritt)</span>
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-booking-text-muted" />
              <Input
                id="email"
                name="email"
                variant="booking"
                type="email"
                inputMode="email"
                autoComplete="email"
                defaultValue={initialContact?.email}
                className="pl-9"
                disabled={isSubmitting}
              />
            </div>
            <Text as="p" variant="caption" className="text-booking-text-muted">
              Vi sender også timebekreftelsen på e-post etter bestilling.
            </Text>
          </div>
        ) : (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setShowEmail(true)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-booking-action-text hover:underline"
          >
            <Plus className="size-4" />
            Legg til e-post (valgfritt)
          </button>
        )}

        {!isEditingContact ? (
          <div className="border-t border-booking-border pt-4">
            <Text as="p" variant="caption" className="text-booking-text-muted">
              Har du allerede en konto?{' '}
              <BookingLink
                to={routes.contactSignIn}
                variant="inline"
                loading={isSubmitting && !pendingIntent && pendingDestination !== routes.selectTime}
                disabled={isSubmitting}
              >
                {isSubmitting && !pendingIntent && pendingDestination !== routes.selectTime
                  ? 'Åpner innlogging...'
                  : 'Logg inn'}
              </BookingLink>
            </Text>
          </div>
        ) : null}
      </div>

      <BookingFooterNav>
        {isEditingContact ? (
          <BookingActionButton
            type="submit"
            name="intent"
            value="cancel-edit"
            variant="secondary"
            loading={isCancellingEdit}
            disabled={isSubmitting}
          >
            Tilbake
          </BookingActionButton>
        ) : (
          <BookingLink
            to={routes.selectTime}
            variant="secondary"
            loading={pendingDestination === routes.selectTime}
            disabled={isSubmitting}
          >
            Tilbake
          </BookingLink>
        )}
        <BookingActionButton
          type="submit"
          name="intent"
          value="identify"
          variant="primary"
          loading={pendingIntent === 'identify'}
          disabled={isSubmitting}
        >
          {pendingIntent === 'identify' ? 'Lagrer...' : isEditingContact ? 'Lagre endringer' : 'Lagre og fortsett'}
        </BookingActionButton>
      </BookingFooterNav>
    </Form>
  );
}

function formatLocalMobileNumber(value?: string | null): string {
  const digits = value?.replace(/\D/g, '') ?? '';
  if (digits.length === 10 && digits.startsWith('47')) return digits.slice(2);
  return digits.slice(-8);
}
