import { redirect, Form, useNavigation } from 'react-router';
import type { Route } from './+types/booking.public.appointment.session.overview.route';
import { Calendar, Clock, User, Mail, Scissors, DollarSign, CheckCircle2, Sparkles } from 'lucide-react';
import { getSession } from '~/lib/appointments.server';
import { PublicAppointmentSessionController } from '~/api/generated/booking';
import { ROUTES_MAP } from '~/lib/route-tree';
import { redirectWithError } from '~/routes/company/_lib/flash-message.server';
import {
  BookingContainer,
  BookingStepHeader,
  BookingButton,
  BookingMeta,
  CollapsibleCard,
  BookingSummary,
  BookingCard,
} from '../../_components/booking-layout';
import { resolveErrorPayload } from '~/lib/api-error';

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const session = await getSession(request);
    if (!session) {
      return redirectWithError(request, ROUTES_MAP['booking.public.appointment'].href, 'Kunne ikke hente oversikt');
    }

    const response = await PublicAppointmentSessionController.getAppointmentSessionOverview({
      query: {
        sessionId: session.sessionId,
      },
    });

    if (!response.data?.data) {
      const message = response.data?.message || 'Kunne ikke hente oversikt';
      return redirectWithError(request, ROUTES_MAP['booking.public.appointment.session.select-time'].href, message);
    }

    return {
      sessionOverview: response.data.data,
      error: null as string | null,
    };
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente oversikt');
    return redirectWithError(request, ROUTES_MAP['booking.public.appointment'].href, message);
  }
}

export async function action({ request }: Route.ActionArgs) {
  try {
    const session = await getSession(request);
    if (!session) {
      return redirectWithError(
        request,
        ROUTES_MAP['booking.public.appointment'].href,
        'Kunne ikke bekrefte timebestilling',
      );
    }

    const submitResponse = await PublicAppointmentSessionController.submitAppointmentSession({
      query: {
        sessionId: session.sessionId,
      },
    });

    const appointmentId = submitResponse.data?.data?.id;
    if (!appointmentId) {
      return redirectWithError(
        request,
        ROUTES_MAP['booking.public.appointment.session.overview'].href,
        'Kunne ikke bekrefte timebestilling',
      );
    }

    return redirect(
      `${ROUTES_MAP['booking.public.appointment.success'].href}?companyId=${session.companyId}&appointmentId=${appointmentId}`,
    );
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke bekrefte timebestilling');
    return redirectWithError(request, ROUTES_MAP['booking.public.appointment'].href, message);
  }
}

/* ========================================
   DATE FORMATTING
   ======================================== */

const DAYS_NO = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
const MONTHS_NO = [
  'januar',
  'februar',
  'mars',
  'april',
  'mai',
  'juni',
  'juli',
  'august',
  'september',
  'oktober',
  'november',
  'desember',
];

function formatNorwegianDateTime(dateTimeString: string): {
  dayName: string;
  date: string;
  time: string;
  full: string;
} {
  const dateObj = new Date(dateTimeString);
  const dayName = DAYS_NO[dateObj.getDay()];
  const day = dateObj.getDate();
  const month = MONTHS_NO[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  const time = dateTimeString.split('T')[1]?.substring(0, 5) || '';

  return {
    dayName,
    date: `${day}. ${month} ${year}`,
    time: `kl. ${time}`,
    full: `${dayName} ${day}. ${month} ${year} kl. ${time}`,
  };
}

/* ========================================
   MAIN COMPONENT
   ======================================== */

export default function BookingPublicAppointmentSessionOverviewRoute({ loaderData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  if (loaderData.error || !loaderData.sessionOverview) {
    return (
      <BookingContainer>
        <BookingStepHeader
          title="Bekreft timebestilling"
          description={loaderData.error ?? 'Kunne ikke hente oversikt'}
        />
      </BookingContainer>
    );
  }

  const { sessionOverview } = loaderData;
  const totalDuration = sessionOverview.selectedServices.reduce((sum, item) => sum + item.services.duration, 0);
  const totalPrice = sessionOverview.selectedServices.reduce((sum, item) => sum + item.services.price, 0);

  const dateTime = formatNorwegianDateTime(sessionOverview.selectedStartTime);

  return (
    <>
      <BookingContainer>
        {/* ========================================
            PAGE HEADER
            ======================================== */}
        <BookingStepHeader title="Bekreft timebestilling" description="Gjennomgå detaljene før du bekrefter" />

        {/* ========================================
            APPOINTMENT HERO CARD
            ======================================== */}
        <BookingCard className="relative overflow-hidden border-primary bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 shadow-sm md:p-6">
          {/* Decorative element */}
          <div className="absolute right-0 top-0 size-32 translate-x-8 -translate-y-8 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative space-y-4">
            {/* Title */}
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary shadow-sm">
                <CheckCircle2 className="size-6 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary md:text-sm">
                  Klar for booking
                </p>
                <p className="text-sm text-muted-foreground md:text-base">
                  {sessionOverview.selectedServices.length}{' '}
                  {sessionOverview.selectedServices.length === 1 ? 'tjeneste' : 'tjenester'}
                </p>
              </div>
            </div>

            {/* Date & Time - Prominent */}
            <div className="space-y-2 rounded-lg bg-background/50 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Calendar className="size-5 text-primary md:size-6" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground md:text-sm">{dateTime.dayName}</p>
                  <p className="text-lg font-bold text-card-text md:text-xl">{dateTime.date}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-card-border pt-2">
                <Clock className="size-5 text-primary md:size-6" />
                <div className="flex flex-1 items-baseline justify-between gap-3">
                  <p className="text-lg font-bold text-card-text md:text-xl">{dateTime.time}</p>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-muted-foreground">{totalDuration} min</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Price - Emphasized */}
            <div className="flex items-center justify-between gap-3 rounded-md bg-primary px-3 py-2 text-primary-foreground">
              <div className="flex items-center gap-2">
                <DollarSign className="size-5 md:size-6" strokeWidth={2.5} />
                <span className="text-xs font-medium md:text-sm">Estimert total pris</span>
              </div>
              <p className="text-lg font-bold md:text-2xl">{totalPrice} kr</p>
            </div>
          </div>
        </BookingCard>

        {/* ========================================
            COLLAPSIBLE DETAILS SECTIONS
            ======================================== */}

        {/* Contact Info */}
        <CollapsibleCard
          title="Bruker"
          icon={<User className="size-5 text-primary" />}
          editLink={ROUTES_MAP['booking.public.appointment.session.contact'].href}
          defaultOpen={false}
        >
          <BookingMeta
            layout="stacked"
            items={[
              {
                label: 'Navn',
                value: `${sessionOverview.user.givenName} ${sessionOverview.user.familyName}`,
                icon: <User className="size-4 text-muted-foreground" />,
              },
              ...(sessionOverview.user.email
                ? [
                    {
                      label: 'E-post',
                      value: sessionOverview.user.email,
                      icon: <Mail className="size-4 text-muted-foreground" />,
                    },
                  ]
                : []),
            ]}
          />
        </CollapsibleCard>

        {/* Stylist */}
        <CollapsibleCard
          title="Behandler"
          icon={<Scissors className="size-5 text-primary" />}
          editLink={ROUTES_MAP['booking.public.appointment.session.employee'].href}
          defaultOpen={false}
        >
          <div className="flex items-start gap-3">
            {sessionOverview.selectedProfile.image && (
              <div className="relative size-16 shrink-0 overflow-hidden rounded-full border-2 border-card-border md:size-20">
                <img
                  src={sessionOverview.selectedProfile.image.url}
                  alt={`${sessionOverview.selectedProfile.givenName} ${sessionOverview.selectedProfile.familyName}`}
                  className="size-full object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <h4 className="text-base font-bold text-card-text md:text-lg">
                {sessionOverview.selectedProfile.givenName} {sessionOverview.selectedProfile.familyName}
              </h4>
              {sessionOverview.selectedProfile.description && (
                <p className="mt-1 text-sm text-muted-foreground md:text-base">
                  {sessionOverview.selectedProfile.description}
                </p>
              )}
            </div>
          </div>
        </CollapsibleCard>

        {/* Services */}
        <CollapsibleCard
          title="Tjenester"
          icon={<Sparkles className="size-5 text-primary" />}
          editLink={ROUTES_MAP['booking.public.appointment.session.select-services'].href}
          badge={
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
              {sessionOverview.selectedServices.length}
            </span>
          }
        >
          <div className="space-y-2">
            {sessionOverview.selectedServices.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-3 rounded-lg border border-card-border bg-card-accent/5 p-3"
              >
                <span className="text-sm font-medium text-card-text md:text-base">{item.services.name}</span>
                <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground md:text-sm">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3 md:size-3.5" />
                    {item.services.duration} min
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-card-text">
                    <DollarSign className="size-3 md:size-3.5" />
                    {item.services.price} kr
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleCard>
      </BookingContainer>

      <div className="hidden md:block h-12" />

      <BookingSummary
        mobile={{
          title: 'Oppsummering',
          items: [
            { label: 'Dato', value: dateTime.full },
            { label: 'Varighet', value: `${totalDuration} min` },
            { label: 'Pris', value: `${totalPrice} kr` },
          ],
          className: 'md:hidden',
          primaryAction: (
            <Form method="post">
              <BookingButton
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                <CheckCircle2 className="size-5" strokeWidth={2.5} />
                Bekreft og book time
              </BookingButton>
            </Form>
          ),
          secondaryAction: (
            <Form method="get" action={ROUTES_MAP['booking.public.appointment.session.select-time'].href}>
              <BookingButton type="submit" variant="outline" size="md" fullWidth>
                Endre tidspunkt
              </BookingButton>
            </Form>
          ),
        }}
        desktopClassName="sticky bottom-4 rounded-lg border-2 border-primary bg-primary p-4 text-primary-foreground shadow-xl"
        desktop={
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-full bg-primary-foreground/20">
                <CheckCircle2 className="size-7" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-xs font-medium opacity-80">Klar for booking</p>
                <p className="text-lg font-bold">{dateTime.full}</p>
                <p className="text-sm font-medium opacity-90">Total: {totalPrice} kr</p>
              </div>
            </div>

            <Form method="post">
              <BookingButton
                type="submit"
                variant="secondary"
                size="lg"
                loading={isSubmitting}
                disabled={isSubmitting}
                className="min-w-[200px]"
              >
                <CheckCircle2 className="size-5" strokeWidth={2.5} />
                Bekreft og book time
              </BookingButton>
            </Form>
          </div>
        }
      />
    </>
  );
}
