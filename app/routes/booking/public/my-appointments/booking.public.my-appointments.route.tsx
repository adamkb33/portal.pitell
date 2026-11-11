import { data, Link, useNavigation, useSearchParams } from 'react-router';
import type { Route } from './+types/booking.public.my-appointments.route';
import { CalendarClock, CalendarPlus, ChevronDown, ChevronLeft, ChevronRight, Gift, MapPin } from 'lucide-react';
import { AppointmentsController, type LoyaltyCardDto, type MyAppointmentDto } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { authService } from '~/lib/auth-service';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { BookingLink } from '~/routes/booking/public/_components/booking-link';
import { Container as BookingContainer, Notice, PageHeader as BookingPageHeader, Stack } from '~/ui';
import {
  buildAppointmentHref,
  buildCalendarPayload,
  buildCancelHref,
  buildGoogleMapsUrl,
  buildLoyaltyHref,
  buildNewBookingHref,
  flattenServiceNames,
  formatDateParts,
  describeLoyaltyProgress,
  getCompanyName,
} from './_utils/my-appointments.utils';

const PAST_PREVIEW_SIZE = 5;
const HISTORY_PAGE_SIZE = 10;
const LATER_PREVIEW_SIZE = 5;

const sectionTitleClass = 'text-sm font-semibold text-booking-text-muted';
const rowListClass = 'mt-2 overflow-hidden rounded-2xl border border-booking-border bg-booking-surface-raised';
const heroPanelClass =
  'rounded-2xl bg-[color-mix(in_oklab,var(--color-booking-text)_78%,var(--color-booking-action))] p-4 text-booking-surface-raised';
const heroButtonClass =
  'inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-2 text-sm font-medium transition-colors';
const heroPrimaryButtonClass = `${heroButtonClass} bg-booking-surface-raised text-booking-text hover:bg-booking-surface-raised/90`;
const heroSecondaryButtonClass = `${heroButtonClass} bg-booking-surface-raised/10 text-booking-surface-raised hover:bg-booking-surface-raised/20`;

const getSafePage = (value: string | null): number => {
  const page = Number(value || '0');
  return Number.isNaN(page) || page < 0 ? 0 : Math.floor(page);
};

const formatCountdown = (iso: string): string => {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date(iso)) - startOfDay(new Date())) / 86_400_000);
  if (days <= 0) return 'I dag';
  if (days === 1) return 'I morgen';
  return `Om ${days} dager`;
};

// Each company keeps one colour from the brand palette so its rows are easy to tell apart.
const companyTints = [
  'bg-booking-surface-raised text-booking-action-text',
  'bg-booking-surface-raised text-booking-accent',
  'bg-booking-surface-raised text-booking-highlight',
] as const;

const FreeBadge = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-booking-highlight px-2 py-0.5 text-xs font-medium text-booking-highlight-contrast">
    <Gift className="size-3" aria-hidden />
    Gratis
  </span>
);

function AppointmentRow({ appointment, isFree = false }: { appointment: MyAppointmentDto; isFree?: boolean }) {
  const date = formatDateParts(appointment.startTime);
  const services = flattenServiceNames(appointment).join(', ');
  const companyName = getCompanyName(appointment.company);

  return (
    <Link
      to={buildAppointmentHref(appointment.id)}
      className="flex min-h-16 items-center gap-4 border-t border-booking-border px-4 py-3 transition-colors first:border-t-0 even:bg-booking-action-muted hover:bg-booking-surface-subtle active:bg-booking-surface-strong"
    >
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl border border-booking-border text-xs font-semibold ${companyTints[appointment.company.id % companyTints.length]}`}
      >
        {companyName.slice(0, 2).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-booking-text">{companyName}</span>
        <span className="block truncate text-sm text-booking-text-muted">
          {date.shortDate} · {date.time}
          {services ? ` · ${services}` : ''}
        </span>
      </span>
      {isFree && <FreeBadge />}
      <ChevronRight className="size-5 shrink-0 text-booking-text-muted" aria-hidden />
    </Link>
  );
}

// Coupon-style ticket: coloured stub with the stamp count, torn off from the body by a dashed edge.
function LoyaltyTicket({ card }: { card: LoyaltyCardDto }) {
  const hasReward = card.nextVisitIsFree;

  return (
    <Link
      to={buildLoyaltyHref(card.companyId)}
      className="relative flex overflow-hidden rounded-2xl border border-booking-border bg-booking-surface-raised"
    >
      <span
        className={`flex w-16 shrink-0 flex-col items-center justify-center gap-0.5 py-4 font-semibold ${hasReward ? 'bg-booking-highlight text-booking-highlight-contrast' : 'bg-booking-accent text-booking-action-contrast'}`}
      >
        <Gift className="size-5" aria-hidden />
        <span className="text-sm">{hasReward ? 'Gratis' : `${card.visitsInCycle}/${card.visitsRequired - 1}`}</span>
      </span>
      <span className="min-w-0 flex-1 border-l-2 border-dashed border-booking-border px-4 py-3">
        <span className="block truncate font-semibold text-booking-text">
          {card.companyName?.trim() || `Bedrift #${card.companyId}`}
        </span>
        <span className="block text-sm text-booking-text-muted">{describeLoyaltyProgress(card)}</span>
      </span>
      <ChevronRight className="my-auto mr-3 size-5 shrink-0 text-booking-text-muted" aria-hidden />
      <span className="absolute -top-2 left-[calc(4rem-0.5rem)] size-4 rounded-full bg-booking-surface" aria-hidden />
      <span
        className="absolute -bottom-2 left-[calc(4rem-0.5rem)] size-4 rounded-full bg-booking-surface"
        aria-hidden
      />
    </Link>
  );
}

export async function loader({ request }: Route.LoaderArgs) {
  await authService.requireAuth(request, ROUTES_MAP['auth.sign-in'].href);

  const url = new URL(request.url);
  const showAllHistory = url.searchParams.get('historikk') === 'alle';
  const historyPage = showAllHistory ? getSafePage(url.searchParams.get('side')) : 0;

  try {
    const [nearestResult, upcomingResult, completedResult, loyaltyResult] = await withAuth(request, async () => {
      return Promise.allSettled([
        AppointmentsController.getMyNearestAppointment(),
        AppointmentsController.getMyUpcomingAppointments({ query: { page: 0, size: LATER_PREVIEW_SIZE + 1 } }),
        AppointmentsController.getMyCompletedAppointments({
          query: { page: historyPage, size: showAllHistory ? HISTORY_PAGE_SIZE : PAST_PREVIEW_SIZE },
        }),
        AppointmentsController.getMyLoyaltyCards(),
      ]);
    });

    const nearestAppointment = nearestResult.status === 'fulfilled' ? (nearestResult.value.data?.data ?? null) : null;
    const upcomingPayload = upcomingResult.status === 'fulfilled' ? upcomingResult.value.data?.data : undefined;
    const completedPayload = completedResult.status === 'fulfilled' ? completedResult.value.data?.data : undefined;
    const loyaltyCards = loyaltyResult.status === 'fulfilled' ? (loyaltyResult.value.data?.data ?? []) : [];

    return data({
      showAllHistory,
      nearestAppointment,
      laterAppointments: (upcomingPayload?.content ?? [])
        .filter((appointment) => appointment.id !== nearestAppointment?.id)
        .slice(0, LATER_PREVIEW_SIZE),
      completedAppointments: completedPayload?.content ?? [],
      completedTotalElements: completedPayload?.totalElements ?? 0,
      completedPage: completedPayload?.page ?? historyPage,
      completedHasNext: completedPayload?.hasNext ?? false,
      completedHasPrevious: completedPayload?.hasPrevious ?? false,
      loyaltyCards,
      error: null as string | null,
    });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke hente dine bookinger akkurat nå.');
    return data(
      {
        showAllHistory,
        nearestAppointment: null as MyAppointmentDto | null,
        laterAppointments: [] as MyAppointmentDto[],
        completedAppointments: [] as MyAppointmentDto[],
        completedTotalElements: 0,
        completedPage: 0,
        completedHasNext: false,
        completedHasPrevious: false,
        loyaltyCards: [] as LoyaltyCardDto[],
        error: message,
      },
      { status: status ?? 400 },
    );
  }
}

export default function BookingPublicMyAppointmentsRoute({ loaderData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();

  const { nearestAppointment, laterAppointments, completedAppointments, loyaltyCards, showAllHistory } = loaderData;
  const freeAppointmentIds = new Set(loyaltyCards.flatMap((card) => card.upcomingFreeAppointmentIds));
  const isLoading = navigation.state !== 'idle';
  const lastVisited = completedAppointments[0];
  const hasAnyBooking = Boolean(nearestAppointment) || laterAppointments.length > 0 || completedAppointments.length > 0;

  const buildHistoryHref = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('historikk', 'alle');
    params.set('side', String(Math.max(0, page)));
    return `?${params.toString()}`;
  };

  const nearestDate = nearestAppointment ? formatDateParts(nearestAppointment.startTime) : null;
  const nearestMapsUrl = buildGoogleMapsUrl(nearestAppointment?.company);
  const nearestCalendar = nearestAppointment
    ? buildCalendarPayload(nearestAppointment, nearestAppointment.company.name)
    : null;
  const nearestServices = nearestAppointment ? flattenServiceNames(nearestAppointment).join(', ') : '';
  const lastVisitedBookHref = buildNewBookingHref(lastVisited?.company.id);

  const pastRows = completedAppointments.map((appointment) => (
    <AppointmentRow key={appointment.id} appointment={appointment} />
  ));

  return (
    <BookingContainer
      gutter="none"
      className={isLoading ? 'pointer-events-none' : undefined}
      aria-busy={isLoading || undefined}
    >
      <Stack space="md">
        <BookingPageHeader title="Mine bookinger" />
        {loaderData.error && (
          <Notice variant="booking" tone="emphasis" title="Kunne ikke hente bookinger" message={loaderData.error} />
        )}

        {showAllHistory ? (
          <section className="space-y-2">
            <BookingLink to="?" variant="inline" className="gap-1">
              <ChevronLeft className="size-4" />
              Tilbake til oversikten
            </BookingLink>
            <h2 className={sectionTitleClass}>Tidligere timer ({loaderData.completedTotalElements})</h2>
            <div className={rowListClass}>{pastRows}</div>
            {(loaderData.completedHasPrevious || loaderData.completedHasNext) && (
              <div className="flex justify-between gap-2 pt-2">
                {loaderData.completedHasPrevious ? (
                  <BookingLink to={buildHistoryHref(loaderData.completedPage - 1)} variant="outline" size="sm">
                    <ChevronLeft className="size-4" />
                    Forrige
                  </BookingLink>
                ) : (
                  <span />
                )}
                {loaderData.completedHasNext && (
                  <BookingLink to={buildHistoryHref(loaderData.completedPage + 1)} variant="outline" size="sm">
                    Neste
                    <ChevronRight className="size-4" />
                  </BookingLink>
                )}
              </div>
            )}
          </section>
        ) : (
          <>
            {nearestAppointment && nearestDate ? (
              <section className={heroPanelClass} aria-label="Din neste time">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <span className="rounded-full bg-booking-highlight px-3 py-1 text-sm font-medium text-booking-highlight-contrast">
                      {formatCountdown(nearestAppointment.startTime)}
                    </span>
                    {freeAppointmentIds.has(nearestAppointment.id) && <FreeBadge />}
                  </span>
                  <span className="text-sm text-booking-surface-raised/70">
                    {nearestDate.time}–{formatDateParts(nearestAppointment.endTime).time}
                  </span>
                </div>
                <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">{nearestDate.longDate}</h2>
                <p className="mt-1 text-lg text-booking-surface-raised/90">
                  {getCompanyName(nearestAppointment.company)}
                  {nearestServices ? ` · ${nearestServices}` : ''}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {nearestCalendar && (
                    <a
                      href={nearestCalendar.href}
                      download={nearestCalendar.filename}
                      className={heroPrimaryButtonClass}
                    >
                      <CalendarClock className="size-4" aria-hidden />
                      Legg i kalender
                    </a>
                  )}
                  {nearestMapsUrl && (
                    <a href={nearestMapsUrl} target="_blank" rel="noreferrer" className={heroSecondaryButtonClass}>
                      <MapPin className="size-4" aria-hidden />
                      Veibeskrivelse
                    </a>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between gap-4 text-sm">
                  <Link
                    to={buildAppointmentHref(nearestAppointment.id)}
                    className="inline-flex items-center gap-1 text-booking-surface-raised/80 hover:text-booking-surface-raised"
                  >
                    Se detaljer
                    <ChevronRight className="size-4" />
                  </Link>
                  <Link to={buildCancelHref(nearestAppointment.id)} className="text-danger hover:underline">
                    Avbestill
                  </Link>
                </div>
              </section>
            ) : hasAnyBooking ? (
              <section className={heroPanelClass}>
                <h2 className="text-3xl font-bold tracking-tight">Ingen planlagte timer</h2>
                {lastVisited && (
                  <p className="mt-2 text-booking-surface-raised/80">
                    Sist hos {getCompanyName(lastVisited.company)} {formatDateParts(lastVisited.startTime).shortDate}
                  </p>
                )}
                <Link
                  to={lastVisitedBookHref ?? ROUTES_MAP['booking.public.appointment'].href}
                  className={`${heroPrimaryButtonClass} mt-4`}
                >
                  <CalendarPlus className="size-4" aria-hidden />
                  {lastVisited ? `Book igjen hos ${getCompanyName(lastVisited.company)}` : 'Book time'}
                </Link>
              </section>
            ) : (
              <section className={heroPanelClass}>
                <h2 className="text-3xl font-bold tracking-tight">Book din første time</h2>
                <p className="mt-2 text-booking-surface-raised/80">Timene dine dukker opp her.</p>
                <Link to={ROUTES_MAP['booking.public.appointment'].href} className={`${heroPrimaryButtonClass} mt-4`}>
                  Book time
                </Link>
              </section>
            )}

            {loyaltyCards.length > 0 && (
              <section>
                <h2 className={sectionTitleClass}>Lojalitet</h2>
                <div className="mt-2 space-y-3">
                  {loyaltyCards.map((card) => (
                    <LoyaltyTicket key={card.companyId} card={card} />
                  ))}
                </div>
              </section>
            )}

            {laterAppointments.length > 0 && (
              <section>
                <details open className={`${rowListClass} group`}>
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-booking-surface-subtle focus-visible:outline-2 focus-visible:outline-booking-action-ring [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0">
                      <span className="block font-medium text-booking-text">Senere</span>
                      <span className="block truncate text-sm text-booking-text-muted">
                        {laterAppointments.length} {laterAppointments.length === 1 ? 'time' : 'timer'} · neste{' '}
                        {formatDateParts(laterAppointments[0].startTime).shortDate}
                      </span>
                    </span>
                    <ChevronDown
                      className="size-5 shrink-0 text-booking-text-muted transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <div className="border-t border-booking-border">
                    {laterAppointments.map((appointment) => (
                      <AppointmentRow
                        key={appointment.id}
                        appointment={appointment}
                        isFree={freeAppointmentIds.has(appointment.id)}
                      />
                    ))}
                  </div>
                </details>
              </section>
            )}

            {completedAppointments.length > 0 && (
              <section>
                <details className={`${rowListClass} group`}>
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-booking-surface-subtle focus-visible:outline-2 focus-visible:outline-booking-action-ring [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0">
                      <span className="block font-medium text-booking-text">Tidligere</span>
                      <span className="block truncate text-sm text-booking-text-muted">
                        {loaderData.completedTotalElements} {loaderData.completedTotalElements === 1 ? 'time' : 'timer'}{' '}
                        · sist {formatDateParts(completedAppointments[0].startTime).shortDate}
                      </span>
                    </span>
                    <ChevronDown
                      className="size-5 shrink-0 text-booking-text-muted transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <div className="border-t border-booking-border">{pastRows}</div>
                  {loaderData.completedTotalElements > PAST_PREVIEW_SIZE && (
                    <BookingLink
                      to={buildHistoryHref(0)}
                      variant="inline"
                      className="min-h-11 gap-1 border-t border-booking-border px-4 text-sm"
                    >
                      Se alle tidligere timer ({loaderData.completedTotalElements})
                      <ChevronRight className="size-4" />
                    </BookingLink>
                  )}
                </details>
              </section>
            )}
          </>
        )}
      </Stack>
    </BookingContainer>
  );
}
