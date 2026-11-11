import { useState } from 'react';
import { Form, Link, redirect, useNavigation } from 'react-router';
import { CalendarClock, ChevronRight, Clock, Loader2, Phone, User } from 'lucide-react';
import { BookingLink } from '~/routes/booking/public/_components/booking-link';
import { PublicAppointmentSessionController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { redirectWithError } from '~/lib/flash-message.server';
import { BookingActionButton } from '~/routes/booking/public/_components/booking-action-button';
import { BookingFooterNav } from '~/routes/booking/public/_components/booking-footer-nav';
import { withBookingBackendCall, withBookingFlowLog } from '~/routes/booking/public/_utils/booking-flow-log.server';
import { requireBookingReady } from '~/routes/booking/public/_utils/booking.require-authenticated-flow.server';
import {
  BOOKING_PRIVACY_URL,
  BOOKING_TERMS_URL,
  MARKETING_EMAIL_LABEL,
  MARKETING_HINT,
  MARKETING_SMS_LABEL,
} from '~/routes/booking/public/_utils/booking-legal';
import { formatEstimatedDuration, formatEstimatedPrice } from '~/routes/booking/public/_utils/booking-price';
import { withOverviewReturnTo } from '~/routes/booking/public/_utils/booking-return-to';
import { getBookingRouteMap } from '~/routes/booking/public/_utils/booking.route-map';
import { useBookingCompanyName } from '~/routes/booking/public/_utils/use-booking-company-name';
import { BookingStepTemplate, Checkbox, cn, Container, Label, PageHeader } from '~/ui';
import { formatNorwegianDateTime } from './_utils/format-norwegian-date-time';
import type { Route } from './+types/booking.public.appointment.session.overview.route';

const ROUTE_ID = 'booking.public.appointment.session.overview';

/** A whole row is the tap target (min 44px); the native checkbox is only the visible box. */
const bookingCheckboxRowClass =
  'flex min-h-11 cursor-pointer items-start gap-3 py-3 text-base font-normal leading-snug tracking-normal text-booking-text';
const bookingCheckboxClass =
  'mt-0.5 h-5 w-5 shrink-0 rounded-md border-2 border-booking-border-strong bg-booking-surface-raised accent-booking-action focus-visible:ring-booking-action-text';

export async function loader({ request }: Route.LoaderArgs) {
  return withBookingFlowLog({ request, routeId: ROUTE_ID, kind: 'loader', step: 'overview' }, async () => {
    const routes = getBookingRouteMap();

    try {
      const guardResult = await requireBookingReady(request);
      if (guardResult instanceof Response) {
        return guardResult;
      }

      const { session } = guardResult;
      const response = await withBookingBackendCall(
        { request, routeId: ROUTE_ID, step: 'overview', call: 'get-overview', session },
        () =>
          withAuth(request, () =>
            PublicAppointmentSessionController.getAppointmentSessionOverview({
              query: {
                sessionId: session.sessionId,
              },
            }),
          ),
      );

      if (!response.data?.data) {
        const message = response.data?.message || 'Kunne ikke hente oversikt';
        return redirectWithError(request, routes.selectTime, message);
      }

      return {
        sessionOverview: response.data.data,
        // With one employee there is nothing to change, so the Behandler row has no "Endre".
        canChangeEmployee: await hasSeveralEmployees(request, session),
      };
    } catch (error) {
      const { message } = resolveErrorPayload(error, 'Kunne ikke hente oversikt');
      return redirectWithError(request, routes.selectTime, message);
    }
  });
}

/** True unless the salon has only one employee to book. If the list can't be loaded, keep "Endre" (the safe side). */
async function hasSeveralEmployees(request: Request, session: { sessionId: string }): Promise<boolean> {
  try {
    const response = await withAuth(request, () =>
      PublicAppointmentSessionController.getAppointmentSessionProfiles({ query: { sessionId: session.sessionId } }),
    );
    const profiles = response.data?.data;
    return !profiles || profiles.length !== 1;
  } catch {
    return true;
  }
}

export async function action({ request }: Route.ActionArgs) {
  return withBookingFlowLog({ request, routeId: ROUTE_ID, kind: 'action', step: 'overview' }, async () => {
    const routes = getBookingRouteMap();

    try {
      const guardResult = await requireBookingReady(request);
      if (guardResult instanceof Response) {
        return guardResult;
      }

      const { session } = guardResult;
      const formData = await request.formData();
      const submitResponse = await withBookingBackendCall(
        { request, routeId: ROUTE_ID, step: 'overview', call: 'submit-appointment', session },
        () =>
          withAuth(request, () =>
            PublicAppointmentSessionController.submitAppointmentSession({
              query: {
                sessionId: session.sessionId,
                acceptedTerms: formData.get('acceptedTerms') === 'on',
                marketingConsentEmail: formData.get('marketingConsentEmail') === 'on',
                marketingConsentSms: formData.get('marketingConsentSms') === 'on',
              },
            }),
          ),
      );

      const appointmentId = submitResponse.data?.data?.appointmentId;
      if (!appointmentId) {
        return redirectWithError(request, routes.overview, 'Kunne ikke bekrefte timebestilling');
      }

      return redirect(`${routes.success}?companyId=${session.companyId}&appointmentId=${appointmentId}`);
    } catch (error) {
      const { message } = resolveErrorPayload(error, 'Kunne ikke bekrefte timebestilling');
      return redirectWithError(request, routes.selectTime, message);
    }
  });
}

export default function BookingOverviewPage({ loaderData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== 'idle';
  const pendingIntent = navigation.formData?.get('intent');
  const isConfirming = isSubmitting && navigation.formData !== undefined && pendingIntent !== 'clear';
  const pendingDestination = navigation.location?.pathname;
  const routes = getBookingRouteMap();
  const companyName = useBookingCompanyName();
  const [termsAccepted, setTermsAccepted] = useState(false);

  if (!loaderData.sessionOverview) {
    return (
      <Container gutter="none" size="lg">
        <PageHeader title="Oversikt" description="Kunne ikke hente oversikt" />
      </Container>
    );
  }

  const { sessionOverview } = loaderData;
  const totalDuration =
    sessionOverview.totalDurationMinutes ??
    sessionOverview.selectedServices.reduce((sum, item) => sum + item.services.duration * item.quantity, 0);
  const totalPrice =
    sessionOverview.totalPrice ??
    sessionOverview.selectedServices.reduce((sum, item) => sum + item.services.price * item.quantity, 0);
  const dateTime = formatNorwegianDateTime(sessionOverview.selectedStartTime);

  const heading = `${dateTime.dayName} ${dateTime.date.replace(/ \d{4}$/, '')}`;
  const startClock = dateTime.time.replace(/^kl\.\s*/, '');
  const employeeName =
    `${sessionOverview.selectedProfile.givenName} ${sessionOverview.selectedProfile.familyName}`.trim();
  const multipleServices = sessionOverview.selectedServices.length > 1;

  const { termsAcceptanceRequired: termsRequired, marketingPrompt } = sessionOverview.legalRequirements;
  const showMarketingEmail = marketingPrompt.showEmail;
  const showMarketingSms = marketingPrompt.showSms;
  const marketingLabel = (template: string) => template.replace('{company}', companyName ?? 'selskapet');

  return (
    <BookingStepTemplate label={companyName} title="Se over og bekreft" contentClassName="gap-3">
      <div className="mx-auto grid w-full items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)]">
        <div className="space-y-3">
          <section
            aria-label="Valgt tidspunkt"
            className="rounded-[var(--radius-booking-panel)] border-[length:var(--border-booking-card)] border-booking-border-strong bg-booking-action-muted p-4"
          >
            <h2 className="text-xl font-bold tracking-tight text-booking-text md:text-2xl">{heading}</h2>
            {/* The time is what people must not get wrong: as bold and as large as the date, not muted. */}
            <p className="mt-0.5 flex items-baseline gap-2 text-booking-text">
              <Clock className="size-5 shrink-0 self-center" aria-hidden />
              <span className="text-xl font-bold tracking-tight tabular-nums md:text-2xl">kl. {startClock}</span>
              <span className="text-sm text-booking-text-muted">{formatEstimatedDuration(totalDuration)}</span>
            </p>
            <BookingLink
              to={withOverviewReturnTo(routes.selectTime)}
              variant="outline"
              loading={pendingDestination === routes.selectTime}
              disabled={isSubmitting}
              className="mt-3 min-h-11 px-4"
            >
              <CalendarClock className="size-4" aria-hidden />
              Endre dato og tid
            </BookingLink>
          </section>

          <div className="overflow-hidden rounded-[var(--radius-booking-panel)] border-[length:var(--border-booking-card)] border-booking-border bg-booking-surface-raised">
            {loaderData.canChangeEmployee ? (
              <EditRow
                to={withOverviewReturnTo(routes.employee)}
                srLabel="Endre behandler"
                isBusy={isSubmitting}
                isLoading={pendingDestination === routes.employee}
              >
                <DetailLabel icon={<User className="size-4" aria-hidden />} label="Behandler">
                  {employeeName}
                </DetailLabel>
              </EditRow>
            ) : (
              <div className="flex min-h-12 items-center px-4 py-2.5">
                <DetailLabel icon={<User className="size-4" aria-hidden />} label="Behandler">
                  {employeeName}
                </DetailLabel>
              </div>
            )}

            <EditRow
              to={`${routes.contact}?edit=1`}
              srLabel="Endre kontaktinformasjon"
              isBusy={isSubmitting}
              isLoading={pendingDestination === routes.contact}
              className="border-t border-booking-border"
            >
              <DetailLabel icon={<Phone className="size-4" aria-hidden />} label="Din kontaktinformasjon">
                {sessionOverview.user.givenName} {sessionOverview.user.familyName}
              </DetailLabel>
            </EditRow>

            <Link
              to={withOverviewReturnTo(routes.selectServices)}
              aria-disabled={isSubmitting}
              onClick={(event) => {
                if (isSubmitting) event.preventDefault();
              }}
              className={cn(
                'flex min-h-12 items-center justify-between gap-3 border-t border-booking-border bg-booking-action-muted px-4 py-2.5 font-semibold text-booking-text transition-colors hover:bg-booking-surface-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-booking-action-text',
                isSubmitting && 'pointer-events-none',
              )}
            >
              {multipleServices ? 'Tjenester' : 'Tjeneste'}
              <EditPill loading={pendingDestination === routes.selectServices} />
            </Link>

            <ul className="divide-y divide-booking-border">
              {sessionOverview.selectedServices.map((item) => (
                <li
                  key={`${item.serviceGroup.id}-${item.services.id}`}
                  className="flex items-start justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-booking-text">
                      {item.services.name}
                      {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                    </p>
                    <p className="text-sm text-booking-text-muted">
                      {formatEstimatedDuration(item.services.duration * item.quantity)}
                    </p>
                  </div>
                  <p className="shrink-0 whitespace-nowrap font-semibold tabular-nums text-booking-text">
                    {formatEstimatedPrice(item.services.price * item.quantity)}
                  </p>
                </li>
              ))}
              {multipleServices ? (
                <li className="flex items-center justify-between gap-4 bg-booking-action-muted px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-booking-text">Estimert total</p>
                    <p className="text-sm text-booking-text-muted">{formatEstimatedDuration(totalDuration)}</p>
                  </div>
                  <p className="shrink-0 whitespace-nowrap text-lg font-bold tabular-nums text-booking-text">
                    {formatEstimatedPrice(totalPrice)}
                  </p>
                </li>
              ) : null}
            </ul>
          </div>

          <p className="px-1 text-sm text-booking-text-muted">Pris og tid er veiledende og kan variere.</p>
        </div>

        <Form method="post" className="space-y-3">
          {termsRequired ? (
            <section
              aria-label="Vilkår og personvern"
              className="rounded-[var(--radius-booking-panel)] border-[length:var(--border-booking-card)] border-booking-border bg-booking-surface-raised px-4"
            >
              <Label className={bookingCheckboxRowClass}>
                <Checkbox
                  name="acceptedTerms"
                  required
                  checked={termsAccepted}
                  onCheckedChange={setTermsAccepted}
                  disabled={isSubmitting}
                  className={bookingCheckboxClass}
                />
                <span>
                  Jeg godtar{' '}
                  <a
                    href={BOOKING_TERMS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-booking-action-text underline underline-offset-2"
                  >
                    vilkårene
                  </a>{' '}
                  og har lest{' '}
                  <a
                    href={BOOKING_PRIVACY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-booking-action-text underline underline-offset-2"
                  >
                    personvernerklæringen
                  </a>
                </span>
              </Label>
            </section>
          ) : null}

          {showMarketingEmail || showMarketingSms ? (
            <section
              aria-label="Markedsføring (valgfritt)"
              className="rounded-[var(--radius-booking-panel)] border-[length:var(--border-booking-card)] border-booking-border bg-booking-surface-raised px-4"
            >
              <div className="divide-y divide-booking-border">
                {showMarketingEmail ? (
                  <Label className={bookingCheckboxRowClass}>
                    <Checkbox name="marketingConsentEmail" disabled={isSubmitting} className={bookingCheckboxClass} />
                    <span>{marketingLabel(MARKETING_EMAIL_LABEL)}</span>
                  </Label>
                ) : null}
                {showMarketingSms ? (
                  <Label className={bookingCheckboxRowClass}>
                    <Checkbox name="marketingConsentSms" disabled={isSubmitting} className={bookingCheckboxClass} />
                    <span>{marketingLabel(MARKETING_SMS_LABEL)}</span>
                  </Label>
                ) : null}
              </div>
              <p className="border-t border-booking-border py-3 text-sm text-booking-text-muted">{MARKETING_HINT}</p>
            </section>
          ) : null}

          <BookingFooterNav message={termsRequired && !termsAccepted ? 'Godta vilkårene for å bekrefte' : undefined}>
            <BookingActionButton
              type="submit"
              variant="confirm"
              loading={isConfirming}
              disabled={isSubmitting || (termsRequired && !termsAccepted)}
            >
              {isConfirming ? 'Bekrefter...' : 'Bekreft timebestilling'}
            </BookingActionButton>
          </BookingFooterNav>
        </Form>
      </div>
    </BookingStepTemplate>
  );
}

/** A whole row that opens the step where the value is changed. The chevron shows it is tappable. */
function EditRow({
  to,
  srLabel,
  isBusy = false,
  isLoading = false,
  className,
  children,
}: {
  to: string;
  srLabel: string;
  isBusy?: boolean;
  isLoading?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const blocked = isBusy || isLoading;

  return (
    <Link
      to={to}
      aria-disabled={blocked}
      onClick={(event) => {
        if (blocked) event.preventDefault();
      }}
      className={cn(
        'flex min-h-12 items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-booking-surface-subtle active:bg-booking-surface-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-booking-action-text',
        blocked && 'pointer-events-none',
        className,
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>
      <EditPill loading={isLoading} />
      <span className="sr-only">{srLabel}</span>
    </Link>
  );
}

/** Visible "Endre" label so it is clear that tapping the row goes to the step where it is changed. */
function EditPill({ loading = false }: { loading?: boolean }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border-[length:var(--border-booking-control)] border-booking-border-strong bg-booking-surface-raised px-3 py-1 text-sm font-medium text-booking-text">
      {loading ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
      Endre
      <ChevronRight className="size-4" aria-hidden />
    </span>
  );
}

function DetailLabel({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-booking-action-muted text-booking-text">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-booking-text-muted">{label}</p>
        <p className="font-semibold text-booking-text">{children}</p>
      </div>
    </div>
  );
}
