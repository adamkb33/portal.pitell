import { formatOslo, osloDateParts } from '~/lib/oslo-time';
import { data, redirect } from 'react-router';
import type { Route } from './+types/booking.public.appointment.success.route';
import { CalendarPlus, Check, Clock, Gift, ListChecks, MapPin, User } from 'lucide-react';
import { BookingLink } from '~/routes/booking/public/_components/booking-link';
import { bookingAnchorClass } from '~/routes/booking/public/my-appointments/_utils/my-appointments.utils';
import { formatEstimatedDuration, formatEstimatedPrice } from '~/routes/booking/public/_utils/booking-price';
import {
  AppointmentsController,
  PublicAppointmentSessionController,
  PublicCompanyController,
  type AppointmentDto,
  type LoyaltyCardDto,
} from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { AppointmentSessionService } from '~/routes/booking/public/_services/booking.appointment-session.service.server';
import { withBookingBackendCall, withBookingFlowLog } from '~/routes/booking/public/_utils/booking-flow-log.server';
import { cn, Container as BookingContainer, PageHeader as BookingStepHeader } from '~/ui';
import { formatNorwegianDateTime } from '../session/overview/_utils/format-norwegian-date-time';
import { SuccessLoyaltyCard } from './_components/success-loyalty-card';

const ROUTE_ID = 'booking.public.appointment.success';

export async function loader({ request }: Route.LoaderArgs) {
  return withBookingFlowLog({ request, routeId: ROUTE_ID, kind: 'loader', step: 'success' }, async () => {
    return successLoader({ request } as Route.LoaderArgs);
  });
}

async function findProviderName(
  request: Request,
  session: { sessionId: string } | null,
  appointment: AppointmentDto,
): Promise<string | null> {
  if (!session) return null;

  try {
    const profilesResponse = await withBookingBackendCall(
      {
        request,
        routeId: ROUTE_ID,
        step: 'success',
        call: 'get-provider',
        context: { appointmentId: appointment.id, profileId: appointment.profileId },
      },
      () =>
        withAuth(request, () =>
          PublicAppointmentSessionController.getAppointmentSessionProfiles({
            query: { sessionId: session.sessionId },
          }),
        ),
    );
    const profile = profilesResponse.data?.data?.find((item) => item.id === appointment.profileId);
    return profile ? [profile.givenName, profile.familyName].filter(Boolean).join(' ') : null;
  } catch {
    return null;
  }
}

// Best effort: a guest without a sign-in, or a company without a loyalty program, just gets no card.
async function findLoyaltyCard(request: Request, companyId: number): Promise<LoyaltyCardDto | null> {
  try {
    const response = await withBookingBackendCall(
      { request, routeId: ROUTE_ID, step: 'success', call: 'get-loyalty-cards', context: { companyId } },
      () => withAuth(request, () => AppointmentsController.getMyLoyaltyCards()),
    );
    return response.data?.data?.find((card) => card.companyId === companyId) ?? null;
  } catch {
    return null;
  }
}

/** Same response for "unknown appointment", "not yours" and a failed lookup, so ids can't be probed. */
function appointmentDetailsUnavailable<T>(companySummary: T) {
  return data({
    companySummary,
    appointment: null,
    providerName: null as string | null,
    loyaltyCard: null as LoyaltyCardDto | null,
    error: 'Kunne ikke hente avtaledetaljene',
  });
}

async function successLoader({ request }: Route.LoaderArgs) {
  try {
    const url = new URL(request.url);
    const companyId = url.searchParams.get('companyId');
    const appointmentId = url.searchParams.get('appointmentId');
    const parsedAppointmentId = appointmentId ? Number(appointmentId) : NaN;
    if (!appointmentId || Number.isNaN(parsedAppointmentId)) {
      return redirect(ROUTES_MAP['booking.public.appointment'].href);
    }
    if (!companyId) {
      throw Error('Selskap ikke gjenkjent');
    }

    await withBookingBackendCall(
      {
        request,
        routeId: ROUTE_ID,
        step: 'success',
        call: 'validate-company-booking',
        context: { companyId: parseInt(companyId) },
      },
      () =>
        withAuth(request, () =>
          AppointmentsController.validateCompanyBooking({
            path: {
              companyId: parseInt(companyId),
            },
          }),
        ),
    );

    const companyResponse = await withBookingBackendCall(
      {
        request,
        routeId: ROUTE_ID,
        step: 'success',
        call: 'get-company',
        context: { companyId: parseInt(companyId) },
      },
      () =>
        withAuth(request, () =>
          PublicCompanyController.publicGetCompanyById({
            path: {
              companyId: parseInt(companyId),
            },
          }),
        ),
    );

    if (!companyResponse.data?.data) {
      throw Error('Selskap ikke funnet');
    }

    try {
      // The backend only returns the appointment to its owner: the signed-in user or this booking session's user.
      const session = await AppointmentSessionService.get(request).catch(() => null);
      const appointmentResponse = await withBookingBackendCall(
        {
          request,
          routeId: ROUTE_ID,
          step: 'success',
          call: 'get-appointment',
          context: { appointmentId: parsedAppointmentId },
        },
        () =>
          withAuth(request, () =>
            PublicAppointmentSessionController.getAppointmentById({
              query: {
                appointmentId: parsedAppointmentId,
                sessionId: session?.sessionId,
              },
            }),
          ),
      );
      const appointment = appointmentResponse.data?.data;
      if (!appointment) {
        return appointmentDetailsUnavailable(companyResponse.data.data);
      }

      const [providerName, loyaltyCard] = await Promise.all([
        findProviderName(request, session, appointment),
        findLoyaltyCard(request, parseInt(companyId)),
      ]);

      return data({
        companySummary: companyResponse.data.data,
        appointment,
        providerName,
        loyaltyCard,
        error: null as string | null,
      });
    } catch {
      return appointmentDetailsUnavailable(companyResponse.data.data);
    }
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke hente bekreftelse');
    return data(
      {
        companySummary: null,
        appointment: null,
        providerName: null as string | null,
        loyaltyCard: null as LoyaltyCardDto | null,
        error: message,
      },
      { status: status ?? 400 },
    );
  }
}

export default function BookingPublicAppointmentSessionSuccessRoute({ loaderData }: Route.ComponentProps) {
  if (!loaderData.companySummary) {
    return (
      <BookingContainer gutter="none">
        <BookingStepHeader title="Timen er bestilt" description={loaderData.error ?? 'Kunne ikke hente bekreftelse'} />
      </BookingContainer>
    );
  }

  const { companySummary } = loaderData;
  const companyName = formatCompanyDisplayName(companySummary.name);
  const formattedAddress = formatAddress(companySummary.businessAddress);
  const mapsUrl = buildGoogleMapsUrl(companySummary.businessAddress);
  const appointment = loaderData.appointment;
  const isFree = Boolean(appointment?.loyaltyFreeVisit);
  const services = appointment?.groupedServiceGroups.flatMap((group) => group.services) ?? [];
  const dateTime = appointment ? formatNorwegianDateTime(appointment.startTime) : null;
  const startDate = appointment ? new Date(appointment.startTime) : null;
  const totalDuration = services.reduce((sum, service) => sum + service.duration, 0);
  const totalPrice = services.reduce((sum, service) => sum + service.price, 0);
  const calendarPayload = appointment
    ? buildCalendarPayload({
        appointment,
        companyName,
        formattedAddress,
      })
    : null;

  return (
    <BookingContainer gutter="none" size="lg">
      <div className="space-y-4">
        <section className="flex items-center gap-3" aria-labelledby="booking-success-heading">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-booking-confirm text-booking-confirm-contrast">
            <Check className="size-6" strokeWidth={3} aria-hidden="true" />
          </span>
          <div>
            <h1 id="booking-success-heading" className="text-2xl font-bold leading-tight text-booking-text md:text-3xl">
              Timen er bestilt
            </h1>
            {appointment ? (
              <p className="mt-0.5 text-sm text-booking-text-muted">
                Vi har sendt bekreftelse på {appointment.user.email?.trim() ? 'e-post' : 'SMS'}.
              </p>
            ) : null}
          </div>
        </section>

        {appointment && dateTime && startDate ? (
          <>
            {/* A free visit gets its own banner; otherwise the stamp card shows the progress this booking adds. */}
            {!isFree && loaderData.loyaltyCard ? <SuccessLoyaltyCard card={loaderData.loyaltyCard} /> : null}
            {isFree ? (
              <section
                aria-label="Gratis time"
                className="flex items-center gap-3 rounded-[var(--radius-booking-panel)] border-[length:var(--border-booking-card)] border-booking-border bg-booking-action-muted px-4 py-3"
              >
                <Gift className="size-5 shrink-0 text-booking-text" aria-hidden />
                <p className="font-semibold text-booking-text">Denne timen er gratis</p>
              </section>
            ) : null}
            <section
              aria-label="Avtaledetaljer"
              className="overflow-hidden rounded-[var(--radius-booking-panel)] border-[length:var(--border-booking-card)] border-booking-border bg-booking-surface-raised"
            >
              <div className="flex">
                <div
                  aria-hidden
                  className="flex w-20 shrink-0 flex-col items-center justify-center border-r-2 border-dashed border-booking-surface-raised bg-booking-action py-4 text-booking-action-contrast"
                >
                  <span className="text-sm">{dateTime.dayName.slice(0, 3).toLocaleLowerCase('nb-NO')}.</span>
                  <span className="text-3xl font-bold leading-none">{osloDateParts(startDate).day}</span>
                  <span className="text-sm">{formatOslo(startDate, { month: 'short' })}</span>
                </div>
                <div className="flex min-w-0 flex-col justify-center gap-0.5 p-4">
                  <h2 className="text-xl font-bold leading-tight tracking-tight text-booking-text md:text-2xl">
                    {dateTime.dayName} {dateTime.date.replace(/ \d{4}$/, '')}
                  </h2>
                  <p className="flex items-center gap-1.5 text-sm text-booking-text-muted">
                    <Clock className="size-4" aria-hidden />
                    {dateTime.time} · {formatEstimatedDuration(totalDuration)}
                  </p>
                </div>
              </div>

              <DetailRow icon={<MapPin className="size-4" aria-hidden />}>
                <p className="font-semibold text-booking-text">{companyName}</p>
                {formattedAddress ? <p className="text-sm text-booking-text-muted">{formattedAddress}</p> : null}
              </DetailRow>
              <DetailRow icon={<User className="size-4" aria-hidden />}>
                <p className="text-xs text-booking-text-muted">Behandler</p>
                <p className="font-semibold text-booking-text">{loaderData.providerName ?? 'Ikke oppgitt'}</p>
              </DetailRow>
            </section>

            <section
              aria-label="Tjenester"
              className="overflow-hidden rounded-[var(--radius-booking-panel)] border-[length:var(--border-booking-card)] border-booking-border bg-booking-surface-raised"
            >
              <ul className="divide-y divide-booking-border">
                {services.map((service) => (
                  <li key={service.id} className="flex items-start justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-booking-text">{service.name}</p>
                      <p className="text-sm text-booking-text-muted">{formatEstimatedDuration(service.duration)}</p>
                    </div>
                    <p
                      className={cn(
                        'shrink-0 whitespace-nowrap font-semibold tabular-nums text-booking-text',
                        isFree && 'text-booking-text-muted line-through',
                      )}
                    >
                      {formatEstimatedPrice(service.price)}
                    </p>
                  </li>
                ))}
                {services.length > 1 ? (
                  <li className="flex items-center justify-between gap-4 bg-booking-action-muted px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-booking-text">Estimert total</p>
                      <p className="text-sm text-booking-text-muted">{formatEstimatedDuration(totalDuration)}</p>
                    </div>
                    <p className="shrink-0 whitespace-nowrap text-lg font-bold tabular-nums text-booking-text">
                      {isFree ? 'Gratis' : formatEstimatedPrice(totalPrice)}
                    </p>
                  </li>
                ) : null}
              </ul>
            </section>

            <p className="px-1 text-sm text-booking-text-muted">
              {isFree ? 'Prisene over viser hva timen normalt koster. ' : ''}Pris og tid er veiledende og kan variere.
            </p>
          </>
        ) : (
          <p className="text-booking-text-muted">{loaderData.error ?? 'Kunne ikke vise avtaledetaljene.'}</p>
        )}

        <div className="space-y-2 pt-1">
          {calendarPayload ? (
            <a
              href={calendarPayload.href}
              download={calendarPayload.filename}
              className={`${bookingAnchorClass('primary')} w-full`}
            >
              <CalendarPlus className="size-4" aria-hidden="true" />
              Legg til i kalender
            </a>
          ) : null}

          <div className={cn('grid gap-2', mapsUrl ? 'grid-cols-2' : 'grid-cols-1')}>
            {mapsUrl ? (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={bookingAnchorClass('tonal')}>
                <MapPin className="size-4" aria-hidden="true" />
                Veibeskrivelse
              </a>
            ) : null}
            <BookingLink to={ROUTES_MAP['booking.public.my-appointments'].href} variant="tonal">
              <ListChecks className="size-4" aria-hidden="true" />
              Mine bookinger
            </BookingLink>
          </div>
        </div>
      </div>
    </BookingContainer>
  );
}

function DetailRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-h-12 items-center gap-3 border-t border-booking-border px-4 py-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-booking-action-muted text-booking-text">
        {icon}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function formatAddress(address: { addressLines?: Array<string>; postalCode?: string; city?: string } | undefined) {
  if (!address) return null;
  const cityLine = [address.postalCode, address.city].filter(Boolean).join(' ');
  const parts = [...(address.addressLines ?? []), cityLine].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

function buildGoogleMapsUrl(
  address: { addressLines?: Array<string>; postalCode?: string; city?: string; country?: string } | undefined,
) {
  if (!address) return null;
  const query = [...(address.addressLines ?? []), address.postalCode, address.city, address.country]
    .filter(Boolean)
    .join(' ');
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}

function buildCalendarPayload({
  appointment,
  companyName,
  formattedAddress,
}: {
  appointment: NonNullable<Route.ComponentProps['loaderData']['appointment']>;
  companyName: string;
  formattedAddress: string | null;
}) {
  const formatIcsDate = (date: Date) => `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
  const serviceNames = appointment.groupedServiceGroups.flatMap((group) =>
    group.services.map((service) => service.name).filter(Boolean),
  );
  const description = serviceNames.length ? `Tjenester: ${serviceNames.join(', ')}` : '';
  const summary = `Avtale hos ${companyName}`;
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pitell//Booking//NO',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${appointment.id}-${appointment.startTime}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(new Date(appointment.startTime))}`,
    `DTEND:${formatIcsDate(new Date(appointment.endTime))}`,
    `SUMMARY:${summary}`,
    description ? `DESCRIPTION:${description}` : null,
    formattedAddress ? `LOCATION:${formattedAddress}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');

  return {
    href: `data:text/calendar;charset=utf-8,${encodeURIComponent(`${icsContent}\r\n`)}`,
    filename: `${companyName || 'appointment'}.ics`.replace(/\s+/g, '-').toLocaleLowerCase('nb-NO'),
  };
}

function formatCompanyDisplayName(name?: string | null): string {
  const trimmedName = name?.trim();
  if (!trimmedName) return 'Virksomheten';

  const lettersOnly = trimmedName.replace(/[^\p{L}]/gu, '');
  if (!lettersOnly || lettersOnly !== lettersOnly.toLocaleUpperCase('nb-NO')) return trimmedName;

  return trimmedName
    .toLocaleLowerCase('nb-NO')
    .replace(/(^|[\s-])(\p{L})/gu, (_match, separator: string, letter: string) => {
      return `${separator}${letter.toLocaleUpperCase('nb-NO')}`;
    });
}
