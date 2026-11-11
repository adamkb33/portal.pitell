import { data, redirect } from 'react-router';
import type { Route } from './+types/booking.public.my-appointments.appointment.route';
import { ArrowLeft, CalendarClock, CalendarPlus, Clock, MapPin } from 'lucide-react';
import { PublicAppointmentSessionController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { authService } from '~/lib/auth-service';
import { redirectWithError } from '~/lib/flash-message.server';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { AppointmentSummaryCard } from '~/routes/booking/public/_components/appointment-summary-card';
import { BookingLink } from '~/routes/booking/public/_components/booking-link';
import { getBookingCompanySummary } from '~/routes/booking/public/_utils/booking-company.server';
import { Container, Notice, Stack } from '~/ui';
import {
  bookingAnchorClass,
  buildCalendarPayload,
  buildCancelHref,
  buildGoogleMapsUrl,
  buildNewBookingHref,
  formatCompanyAddress,
  formatDateParts,
  getCompanyName,
} from '../_utils/my-appointments.utils';

const OVERVIEW_HREF = ROUTES_MAP['booking.public.my-appointments'].href;

export async function loader({ request, params }: Route.LoaderArgs) {
  const appointmentId = Number(params.appointmentId);
  if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
    return redirectWithError(request, OVERVIEW_HREF, 'Ugyldig avtale-ID.');
  }

  const auth = await authService.getAuth(request);
  if (!auth) throw redirect(ROUTES_MAP['auth.sign-in'].href);

  try {
    const response = await withAuth(request, () =>
      PublicAppointmentSessionController.getAppointmentById({ query: { appointmentId } }),
    );
    const appointment = response.data?.data;

    if (!appointment) {
      return data({ appointment: null, company: null, isUpcoming: false, error: 'Fant ikke timen.' }, { status: 404 });
    }
    if (appointment.userId !== auth.id) {
      return redirectWithError(request, OVERVIEW_HREF, 'Du kan bare se egne avtaler.');
    }

    const companyId = appointment.groupedServiceGroups[0]?.companyId;
    return data({
      appointment,
      company: companyId ? await getBookingCompanySummary(companyId, request) : null,
      isUpcoming: new Date(appointment.startTime).getTime() > Date.now(),
      error: null as string | null,
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke hente timen.');
    return data({ appointment: null, company: null, isUpcoming: false, error: message }, { status: status ?? 400 });
  }
}

export default function BookingPublicMyAppointmentsAppointmentRoute({ loaderData }: Route.ComponentProps) {
  const { appointment, company, isUpcoming, error } = loaderData;

  const start = appointment ? formatDateParts(appointment.startTime) : null;
  const companyName = company ? getCompanyName(company) : undefined;
  const addressText = formatCompanyAddress(company);
  const mapsUrl = buildGoogleMapsUrl(company);
  const bookHref = buildNewBookingHref(appointment?.groupedServiceGroups[0]?.companyId);
  const calendar = appointment && isUpcoming ? buildCalendarPayload(appointment, companyName) : null;

  return (
    <Container gutter="none">
      <Stack space="md">
        <BookingLink
          to={OVERVIEW_HREF}
          variant="inline"
          className="min-h-11 gap-2 self-start text-booking-action-text hover:text-booking-action-text"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Mine bookinger
        </BookingLink>

        {error && <Notice variant="booking" tone="emphasis" title="Kunne ikke vise timen" message={error} />}

        {appointment && start && (
          <>
            <section>
              <span className="inline-block rounded-full bg-booking-highlight px-3 py-1 text-sm font-medium text-booking-highlight-contrast">
                {isUpcoming ? 'Kommende time' : 'Tidligere time'}
              </span>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-booking-text md:text-4xl">{start.longDate}</h1>
              <p className="mt-2 flex items-center gap-2 text-lg text-booking-text-muted">
                <Clock className="size-5" aria-hidden />
                {start.time}–{formatDateParts(appointment.endTime).time}
              </p>
            </section>

            <AppointmentSummaryCard
              groupedServiceGroups={appointment.groupedServiceGroups}
              companyName={companyName}
              addressText={addressText}
            />

            <div className="space-y-2">
              {calendar ? (
                <a
                  href={calendar.href}
                  download={calendar.filename}
                  className={`${bookingAnchorClass('primary')} w-full`}
                >
                  <CalendarClock className="size-4" aria-hidden />
                  Legg i kalender
                </a>
              ) : (
                bookHref && (
                  <BookingLink to={bookHref} fullWidth>
                    <CalendarPlus className="size-4" aria-hidden />
                    Book igjen
                  </BookingLink>
                )
              )}
              {(mapsUrl || (calendar && bookHref)) && (
                <div className="grid grid-cols-2 gap-2">
                  {mapsUrl && (
                    <a href={mapsUrl} target="_blank" rel="noreferrer" className={bookingAnchorClass('tonal')}>
                      <MapPin className="size-4" aria-hidden />
                      Veibeskrivelse
                    </a>
                  )}
                  {calendar && bookHref && (
                    <BookingLink to={bookHref} variant="tonal">
                      <CalendarPlus className="size-4" aria-hidden />
                      Book ny time
                    </BookingLink>
                  )}
                </div>
              )}
              {isUpcoming && (
                <p className="text-center">
                  <BookingLink
                    to={buildCancelHref(appointment.id)}
                    variant="inline"
                    className="min-h-11 text-booking-danger-text hover:text-booking-danger-text"
                  >
                    Avbestill time
                  </BookingLink>
                </p>
              )}
            </div>
          </>
        )}
      </Stack>
    </Container>
  );
}
