import { data, redirect, Link } from 'react-router';
import type { Route } from './+types/booking.public.appointment.success.route';
import { Check, MapPin, Calendar, Mail, Bell, Clock, ExternalLink, Share2, Sparkles, PartyPopper } from 'lucide-react';
import { PublicCompanyController } from '~/api/generated/base';
import { AppointmentsController, PublicAppointmentSessionController } from '~/api/generated/booking';
import {
  BookingContainer,
  BookingStepHeader,
  BookingButton,
  BookingCard,
  BookingSummary,
  BookingSection,
} from '../_components/booking-layout';
import { resolveErrorPayload } from '~/lib/api-error';
import { ROUTES_MAP } from '~/lib/route-tree';

export async function loader({ request }: Route.LoaderArgs) {
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

    await AppointmentsController.validateCompanyBooking({
      path: {
        companyId: parseInt(companyId),
      },
    });

    const companyResponse = await PublicCompanyController.publicGetCompanyById({
      path: {
        companyId: parseInt(companyId),
      },
    });

    if (!companyResponse.data?.data) {
      throw Error('Selskap ikke funnet');
    }

    try {
      const appointmentResponse = await PublicAppointmentSessionController.getAppointmentById({
        query: {
          appointmentId: parsedAppointmentId,
        },
      });
      return data({
        companySummary: companyResponse.data.data,
        appointment: appointmentResponse.data?.data ?? undefined,
        error: null as string | null,
      });
    } catch {
      return data({
        companySummary: companyResponse.data.data,
        appointment: null,
        error: 'Kunne ikke hente avtale',
      });
    }
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke hente bekreftelse');
    return data(
      {
        companySummary: null,
        sessionOverview: null,
        error: message,
      },
      { status: status ?? 400 },
    );
  }
}

export default function BookingPublicAppointmentSessionSuccessRoute({ loaderData }: Route.ComponentProps) {
  if (loaderData.error || !loaderData.companySummary) {
    return (
      <BookingContainer>
        <BookingStepHeader
          title="Timen er bekreftet"
          description={loaderData.error ?? 'Kunne ikke hente bekreftelse'}
        />
      </BookingContainer>
    );
  }

  const { companySummary } = loaderData;

  const formatAddress = () => {
    const address = companySummary.businessAddress;
    if (!address) return null;

    const parts = [
      ...(address.addressLines || []),
      address.postalCode && address.city ? `${address.postalCode} ${address.city}` : address.city,
      address.country,
    ].filter(Boolean);

    return parts.join(', ');
  };

  const getGoogleMapsUrl = () => {
    const address = companySummary.businessAddress;
    if (!address) return null;

    const query = [...(address.addressLines || []), address.postalCode, address.city, address.country]
      .filter(Boolean)
      .join(' ');

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  };

  const formattedAddress = formatAddress();
  const mapsUrl = getGoogleMapsUrl();

  const buildCalendarPayload = () => {
    if (!loaderData.appointment) return null;
    const { appointment } = loaderData;
    const startDate = new Date(appointment.startTime);
    const endDate = new Date(appointment.endTime);

    const formatIcsDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const summary = `Avtale hos ${companySummary.name}`;
    const serviceNames = appointment.groupedServiceGroups
      .flatMap((group) => group.services.map((service) => service.name))
      .filter(Boolean);
    const descriptionParts = [
      serviceNames.length > 0 ? `Tjenester: ${serviceNames.join(', ')}` : null,
      formattedAddress ? `Adresse: ${formattedAddress}` : null,
    ].filter(Boolean);
    const description = descriptionParts.join('\\n');
    const location = formattedAddress ?? '';
    const uid = `${companySummary.id ?? 'company'}-${appointment.startTime}`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Pitell//Booking//NO',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(startDate)}`,
      `DTEND:${formatIcsDate(endDate)}`,
      `SUMMARY:${summary}`,
      description ? `DESCRIPTION:${description.replace(/\n/g, '\\n')}` : null,
      location ? `LOCATION:${location}` : null,
      'END:VEVENT',
      'END:VCALENDAR',
    ]
      .filter(Boolean)
      .join('\r\n');

    const href = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
    const filename = `${companySummary.name || 'appointment'}.ics`.replace(/\s+/g, '-').toLowerCase();

    const googleDates = `${formatIcsDate(startDate)}/${formatIcsDate(endDate)}`;
    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      summary,
    )}&dates=${encodeURIComponent(googleDates)}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(
      location,
    )}`;

    return { href, filename, googleUrl };
  };

  const calendarPayload = buildCalendarPayload();

  return (
    <>
      <BookingContainer>
        <BookingStepHeader title="Timen er bekreftet" description="Vi gleder oss til å se deg." />
        <BookingCard className="relative overflow-hidden border-secondary bg-gradient-to-br from-secondary/20 via-secondary/10 to-transparent p-6 shadow-lg md:p-8">
          {/* Decorative elements - confetti feel */}
          <div className="absolute -right-8 -top-8 size-32 rounded-full bg-secondary/20 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 size-32 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative space-y-4">
            {/* Success icon */}
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="flex size-20 items-center justify-center rounded-full bg-secondary shadow-lg md:size-24">
                  <Check className="size-10 text-secondary-foreground md:size-12" strokeWidth={3} />
                </div>
                {/* Sparkle decoration */}
                <div className="absolute -right-1 -top-1">
                  <Sparkles className="size-6 text-primary md:size-8" fill="currentColor" />
                </div>
              </div>
            </div>

            {/* Success message */}
            <div className="text-center">
              <h1 className="text-2xl font-bold text-card-text md:text-3xl lg:text-4xl">Timen er bekreftet! 🎉</h1>
              <p className="mt-2 text-base text-muted-foreground md:text-lg">Vi gleder oss til å se deg</p>
            </div>

            {/* Confirmation number (if available) */}
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-4 py-2">
                <PartyPopper className="size-4 text-secondary" />
                <span className="text-sm font-semibold text-card-text">Bekreftelse sendt til e-post</span>
              </div>
            </div>
          </div>
        </BookingCard>

        {/* ========================================
          APPOINTMENT DETAILS CARD
          ======================================== */}
        <BookingCard className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
              <Calendar className="size-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-card-text md:text-xl">Din time hos {companySummary.name}</h2>
          </div>

          {/* TODO: Add actual booking details if available in response */}
          {/* This would come from session data or query params */}
          <div className="space-y-3 rounded-lg bg-muted/50 p-4">
            <p className="text-sm font-medium text-muted-foreground">Du vil motta alle detaljer på e-post</p>
            {/* If we had booking details:
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <p className="text-base font-semibold">[Date]</p>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <p className="text-base font-semibold">[Time]</p>
            </div>
          </div>
          */}
          </div>

          {/* Add to calendar CTA */}
          {calendarPayload ? (
            <div className="grid gap-2 md:grid-cols-2">
              <a
                href={calendarPayload.googleUrl}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-primary bg-primary/5 px-4 py-3 font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                <ExternalLink className="size-5" />
                Google Kalender
              </a>
              <a
                href={calendarPayload.href}
                download={calendarPayload.filename}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-primary bg-primary/5 px-4 py-3 font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                <Calendar className="size-5" />
                Apple Kalender
              </a>
            </div>
          ) : (
            <button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border-2 border-primary/30 bg-primary/5 px-4 py-3 font-semibold text-primary/60"
            >
              <Calendar className="size-5" />
              Legg til i kalender
            </button>
          )}
        </BookingCard>

        {/* ========================================
          LOCATION CARD - Prominent
          ======================================== */}
        <BookingCard className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
              <MapPin className="size-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-card-text md:text-xl">Møtested</h2>
          </div>

          {/* Company name */}
          <div>
            <h3 className="text-base font-bold text-card-text md:text-lg">{companySummary.name || 'Ukjent selskap'}</h3>
            {formattedAddress && <p className="mt-1 text-sm text-muted-foreground md:text-base">{formattedAddress}</p>}
          </div>

          {/* Map CTA - Prominent */}
          {mapsUrl && (
            <Link
              to={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-card-border bg-card-accent/10 px-6 py-4 font-semibold text-card-text transition-all hover:border-primary hover:bg-card-accent/20"
            >
              <MapPin className="size-5" />
              <span>Åpne i Google Maps</span>
              <ExternalLink className="size-4" />
            </Link>
          )}

          {/* Detailed address - Collapsed */}
          {companySummary.businessAddress && (
            <details className="group">
              <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground hover:text-card-text">
                <span>Vis full adresse</span>
                <svg
                  className="size-4 transition-transform group-open:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-3 space-y-1 rounded-lg bg-muted/50 p-3">
                {companySummary.businessAddress.addressLines?.map((line, idx) => (
                  <p key={idx} className="text-sm text-card-text">
                    {line}
                  </p>
                ))}
                {(companySummary.businessAddress.postalCode || companySummary.businessAddress.city) && (
                  <p className="text-sm text-card-text">
                    {[companySummary.businessAddress.postalCode, companySummary.businessAddress.city]
                      .filter(Boolean)
                      .join(' ')}
                  </p>
                )}
                {companySummary.businessAddress.country && (
                  <p className="text-sm text-card-text">{companySummary.businessAddress.country}</p>
                )}
              </div>
            </details>
          )}
        </BookingCard>

        {/* ========================================
          WHAT'S NEXT - Timeline
          ======================================== */}
        <BookingCard className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
              <Clock className="size-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-card-text md:text-xl">Hva skjer nå?</h2>
          </div>

          {/* Timeline */}
          <ol className="space-y-4">
            {/* Step 1 */}
            <li className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex size-10 items-center justify-center rounded-full bg-secondary">
                  <Mail className="size-5 text-secondary-foreground" />
                </div>
                <div className="mt-2 h-full w-0.5 bg-card-border" />
              </div>
              <div className="flex-1 pb-4">
                <h3 className="text-base font-bold text-card-text">Du mottar en bekreftelse</h3>
                <p className="mt-1 text-sm text-muted-foreground md:text-base">
                  Vi sender deg en e-post med alle detaljer om timen din innen få minutter
                </p>
              </div>
            </li>

            {/* Step 2 */}
            <li className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/20">
                  <Bell className="size-5 text-primary" />
                </div>
                <div className="mt-2 h-full w-0.5 bg-card-border" />
              </div>
              <div className="flex-1 pb-4">
                <h3 className="text-base font-bold text-card-text">Du får en påminnelse</h3>
                <p className="mt-1 text-sm text-muted-foreground md:text-base">
                  Vi sender deg en påminnelse dagen før timen din
                </p>
              </div>
            </li>

            {/* Step 3 */}
            <li className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary">
                  <Check className="size-5 text-primary-foreground" strokeWidth={3} />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-card-text">Møt opp til avtalt tid</h3>
                <p className="mt-1 text-sm text-muted-foreground md:text-base">
                  Husk å møte opp i god tid på angitt adresse. Vi gleder oss til å se deg!
                </p>
              </div>
            </li>
          </ol>
        </BookingCard>

        {/* ========================================
          SOCIAL SHARING (Optional but powerful)
          ======================================== */}
        <BookingSection className="border-dashed">
          <div className="flex items-center gap-3">
            <Share2 className="size-5 shrink-0 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium text-card-text">Liker du {companySummary.name}?</p>
              <p className="text-xs text-muted-foreground">Del gjerne dine erfaringer med andre</p>
            </div>
            <button
              type="button"
              onClick={() => {
                // TODO: Social sharing logic
                if (navigator.share) {
                  navigator.share({
                    title: `Book time hos ${companySummary.name}`,
                    text: 'Jeg har nettopp booket time!',
                    url: window.location.origin,
                  });
                }
              }}
              className="shrink-0 text-sm font-medium text-primary hover:underline"
            >
              Del
            </button>
          </div>
        </BookingSection>

        {/* ========================================
          HELP/SUPPORT FOOTER
          ======================================== */}
        <BookingSection variant="muted" className="text-center">
          <p className="text-sm text-muted-foreground">
            Trenger du å endre eller avbestille timen?{' '}
            <a href="/support" className="font-medium text-primary hover:underline">
              Kontakt oss
            </a>
          </p>
        </BookingSection>
      </BookingContainer>
      <BookingSummary
        mobile={{
          items: [],
          primaryAction: (
            <Link to={ROUTES_MAP['booking.public.my-appointments'].href}>
              <BookingButton variant="primary" size="md" fullWidth>
                Se mine bookinger
              </BookingButton>
            </Link>
          ),
          secondaryAction: (
            <Link to={ROUTES_MAP['booking.public.appointment.session.contact'].href}>
              <BookingButton variant="outline" size="md" fullWidth>
                Book en ny time
              </BookingButton>
            </Link>
          ),
        }}
      />
    </>
  );
}
