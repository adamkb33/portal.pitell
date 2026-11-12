import { addDays, addWeeks, format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { CalendarCheck, ChevronLeft, ChevronRight, Moon, Plus } from 'lucide-react';
import type { Route } from './+types/company.booking.schedule.route';
import {
  Booking,
  CompanyUserAppointmentController,
  type AppointmentDto,
  type CompanyUserScheduleOverviewDto,
} from '~/api/generated';
import { formatEstimatedPrice } from '~/routes/booking/public/_utils/booking-price';
import { AppointmentListRow } from '../appointments/_components/appointment.list-row';
import { getAppointmentTotals, isAppointmentInProgress } from '../appointments/_utils/appointments.utils';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { logger } from '~/lib/logger';
import { DEFAULT_QUERY_TIMEZONE, formatDateBoundaryInTimeZone, formatDateInputInTimeZone } from '~/lib/query';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import {
  Button,
  CompanyPageTemplate,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  PageNotice,
} from '~/ui';
import { BookingDailyToolbar } from '~/routes/company/booking/_components/booking-daily-switch';
import type { ScheduleWeekDay } from './_types/schedule.types';
import {
  getEarliestScheduleWeekStart,
  getLatestScheduleWeekStart,
  toSafeScheduleDate,
  toWeekRange,
  toWeekStart,
  WEEKDAY,
} from './_utils/schedule-date.utils';
import {
  buildScheduleDays,
  getAppointmentDetailHref,
  getUnavailabilityEditHref,
  type ScheduleDay,
} from './_utils/schedule-days';
import type { CreateActionHandle } from '~/lib/routing/create-action';

export const handle = {
  createAction: {
    label: 'Bestill ny avtale',
    // Tells the new-appointment page it was started from Kalender, so its ‹ and the breadcrumb lead back here.
    to: `${ROUTES_MAP['company.booking.appointments.create'].href}?fra=kalender`,
    requires: 'company.booking.appointments',
  },
} satisfies CreateActionHandle;

function createEmptyOverview(): CompanyUserScheduleOverviewDto {
  return {
    profileId: 0,
    dailySchedules: [],
    appointments: [],
    unavailabilities: [],
    availabilities: [],
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const date = toSafeScheduleDate(url.searchParams.get('date'));
  const range = toWeekRange(date);
  const fromDateTime = formatDateBoundaryInTimeZone(range.fromDate, 'start');
  const toDateTime = formatDateBoundaryInTimeZone(range.toDate, 'end');

  logger.info('[company.booking.schedule] Loader request', {
    date,
    fromDate: range.fromDate,
    toDate: range.toDate,
    fromDateTime,
    toDateTime,
    timezone: DEFAULT_QUERY_TIMEZONE,
  });

  try {
    const response = await withAuth(request, async () =>
      Booking.getScheduleOverview({ query: { fromDateTime, toDateTime } }),
    );

    const overview = response.data?.data ?? createEmptyOverview();

    // Customer names and services are not in the overview. Without them the cards fall back to "Avtale".
    const details = await withAuth(request, async () =>
      CompanyUserAppointmentController.getAppointments({
        query: { page: 0, size: 100, fromDateTime, toDateTime, direction: 'ASC' },
      }),
    )
      .then((res) => res.data?.data?.content ?? [])
      .catch(() => [] as AppointmentDto[]);

    logger.info('[company.booking.schedule] Overview response', {
      profileId: overview.profileId,
      dailySchedules: overview.dailySchedules.length,
      appointments: overview.appointments.length,
      unavailabilities: overview.unavailabilities.length,
      availabilities: overview.availabilities.length,
    });

    return {
      date,
      fromDateTime,
      toDateTime,
      overview,
      details,
      error: null as string | null,
    };
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente kalenderoversikt');
    logger.error('[company.booking.schedule] Overview request failed', {
      date,
      fromDateTime,
      toDateTime,
      error,
    });

    return {
      date,
      fromDateTime,
      toDateTime,
      overview: createEmptyOverview(),
      details: [] as AppointmentDto[],
      error: message,
    };
  }
}

export default function CompanyBookingSchedulePage({ loaderData }: Route.ComponentProps) {
  const { overview, details } = loaderData;
  const navigate = useNavigate();
  const detailById = useMemo(() => new Map(details.map((appointment) => [appointment.id, appointment])), [details]);
  const selectedWeekStart = toWeekStart(new Date(`${loaderData.date}T00:00:00`));
  const previousWeekStart = addWeeks(selectedWeekStart, -1);
  const nextWeekStart = addWeeks(selectedWeekStart, 1);

  const weekDays = useMemo<ScheduleWeekDay[]>(() => {
    const weekStart = toWeekStart(new Date(`${loaderData.date}T00:00:00`));
    const todayKey = formatDateInputInTimeZone(new Date());
    return Array.from({ length: 7 }).map((_, idx) => {
      const dayDate = addDays(weekStart, idx);
      const key = format(dayDate, 'yyyy-MM-dd');
      return {
        date: dayDate,
        key,
        dayOfWeek: WEEKDAY[dayDate.getDay()],
        label: format(dayDate, 'EEE', { locale: nb }).replace('.', ''),
        isToday: key === todayKey,
        isPast: key < todayKey,
      };
    });
  }, [loaderData.date]);

  const days = useMemo(() => buildScheduleDays(overview, weekDays), [overview, weekDays]);
  const selectedDayKey = days.some((day) => day.key === loaderData.date)
    ? loaderData.date
    : (days.find((day) => day.isToday) ?? days[0]).key;

  const selectDay = (dayKey: string) => {
    navigate(`${ROUTES_MAP['company.booking.schedule'].href}?date=${dayKey}`, { replace: true });
  };

  const selectedDay = days.find((day) => day.key === selectedDayKey) ?? days[0];
  const returnTo = `${ROUTES_MAP['company.booking.schedule'].href}?date=${selectedDay.key}`;

  const now = new Date();
  // "Neste" is the first appointment still to come, across the whole week (like Timebestillinger).
  const nextAppointmentId = details
    .filter((appointment) => !appointment.noShow && new Date(appointment.startTime) > now)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0]?.id;
  const previousWeek = previousWeekStart >= getEarliestScheduleWeekStart() ? previousWeekStart : null;
  const nextWeek = nextWeekStart <= getLatestScheduleWeekStart() ? nextWeekStart : null;

  // Today opens on what's happening: "Nå" (or "Neste") near the top, with half of the row before it peeking above
  // so it's clear there's more. Other days start at the top.
  const listRef = useRef<HTMLDivElement>(null);
  const isToday = selectedDay.isToday;
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const target = isToday
      ? (list.querySelector<HTMLElement>('[data-marker="now"]') ??
        list.querySelector<HTMLElement>('[data-marker="next"]'))
      : null;
    list.scrollTop = target ? Math.max(0, target.offsetTop - target.offsetHeight / 2) : 0;
  }, [selectedDay.key, isToday]);

  return (
    <CompanyPageTemplate title="Kalender">
      {/* Fills the screen (approved sketch B, 2026-11-12): the room the shell leaves between the header and the
          create button + bottom menu on phones, or the footer on desktop. The week and the day stay put; only the
          rows scroll. The numbers are the shell's own: main's padding in root.layout.tsx and the header/footer tokens. */}
      <div className="flex h-[calc(100dvh-var(--app-header-height)-0.75rem-8.875rem-env(safe-area-inset-bottom))] min-h-[26rem] flex-col gap-4 lg:h-[calc(100dvh-var(--app-header-height)-var(--app-footer-height)-4rem)]">
        <BookingDailyToolbar />

        {loaderData.error ? (
          <PageNotice title="Kunne ikke hente kalenderen" className="min-h-0 flex-1" />
        ) : (
          <section
            aria-label="Kalender"
            className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background"
          >
            {/* ‹ the week's days › — one strip on phone and desktop (approved sketch 2026-11-12). */}
            <div className="flex shrink-0 items-center gap-0.5 p-2 sm:gap-1 sm:p-3">
              <WeekArrow label="Forrige uke" date={previousWeek}>
                <ChevronLeft className="size-5" />
              </WeekArrow>
              <div role="group" aria-label="Velg dag" className="grid min-w-0 flex-1 grid-cols-7 gap-0.5 sm:gap-1">
                {days.map((day) => {
                  const selected = day.key === selectedDay.key;
                  return (
                    <button
                      key={day.key}
                      type="button"
                      aria-pressed={selected}
                      aria-label={format(day.date, 'EEEE d. MMMM', { locale: nb })}
                      onClick={() => selectDay(day.key)}
                      className={cn(
                        'flex h-16 flex-col items-center justify-center rounded-[var(--radius-control)] text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive',
                        selected
                          ? 'bg-interactive text-text-inverse'
                          : day.isOpen
                            ? 'text-text-primary hover:bg-surface-variant-1'
                            : 'text-text-disabled hover:bg-surface-variant-1',
                      )}
                    >
                      <span className={cn('text-xs', selected ? 'text-text-inverse' : 'text-text-secondary')}>
                        {day.label}
                      </span>
                      <span className={cn('font-semibold', day.isToday && !selected && 'text-interactive')}>
                        {format(day.date, 'd')}
                      </span>
                      {day.isFull ? <span className="sr-only">Fullt</span> : null}
                    </button>
                  );
                })}
              </div>
              <WeekArrow label="Neste uke" date={nextWeek}>
                <ChevronRight className="size-5" />
              </WeekArrow>
            </div>

            <DayStrip day={selectedDay} detailById={detailById} />
            <div
              ref={listRef}
              data-testid="kalender-rows"
              className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain"
            >
              <DayItems
                day={selectedDay}
                returnTo={returnTo}
                detailById={detailById}
                now={now}
                nextAppointmentId={nextAppointmentId}
              />
            </div>

            <div className="shrink-0 border-t border-border px-4 py-2 sm:px-5">
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="px-0">
                    <Plus className="h-4 w-4" /> Bookbar tid eller fravær
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-48">
                  <DropdownMenuItem asChild>
                    <Link to={ROUTES_MAP['company.booking.schedule.availabilities'].href}>Bookbar tid</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={ROUTES_MAP['company.booking.schedule-unavailability.create'].href}>
                      Fravær eller pause
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </section>
        )}
      </div>
    </CompanyPageTemplate>
  );
}

function WeekArrow({ label, date, children }: { label: string; date: Date | null; children: React.ReactNode }) {
  const arrowClass = 'flex h-11 w-7 shrink-0 items-center justify-center rounded-md sm:w-9';
  if (!date) {
    return (
      <span className={cn(arrowClass, 'text-text-disabled')} aria-hidden>
        {children}
      </span>
    );
  }
  return (
    <Link
      to={`?date=${format(date, 'yyyy-MM-dd')}`}
      aria-label={label}
      className={cn(
        arrowClass,
        'text-interactive hover:bg-surface-variant-1 focus-visible:outline-2 focus-visible:outline-interactive',
      )}
    >
      {children}
    </Link>
  );
}

type DetailById = Map<number, AppointmentDto>;

/** The grey strip above the day's rows, like the group strips in Timebestillinger. */
function DayStrip({ day, detailById }: { day: ScheduleDay; detailById: DetailById }) {
  const booked = day.items.filter((item) => item.kind === 'appointment' && !item.cancelled);
  const price = booked.reduce((sum, item) => {
    const detail = detailById.get(item.id);
    return detail ? sum + getAppointmentTotals(detail).price : sum;
  }, 0);
  return (
    <h3 className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-slate-100 px-4 py-1.5 text-xs font-semibold text-text-primary sm:px-5">
      <span className="first-letter:uppercase">{format(day.date, 'EEEE d. MMMM', { locale: nb })}</span>
      <span className="font-normal text-text-secondary">
        {day.isFull ? 'Fullt · ' : ''}
        {booked.length} {booked.length === 1 ? 'avtale' : 'avtaler'}
        {price > 0 ? ` · ${formatEstimatedPrice(price)}` : ''}
      </span>
    </h3>
  );
}

const flatRowClass =
  'flex h-[3.75rem] w-full items-center gap-3 px-4 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-interactive sm:px-5';

function DayItems({
  day,
  returnTo,
  detailById,
  now,
  nextAppointmentId,
}: {
  day: ScheduleDay;
  returnTo: string;
  detailById: DetailById;
  now: Date;
  nextAppointmentId: number | undefined;
}) {
  if (day.items.length === 0) {
    const EmptyIcon = day.isOpen ? CalendarCheck : Moon;
    return (
      <div className="flex flex-col items-center justify-center gap-3 border-t border-border px-6 py-12 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-blue-50 text-interactive">
          <EmptyIcon className="size-7" aria-hidden />
        </span>
        <p className="text-base font-semibold text-text-primary">
          {day.isOpen ? 'Ingen avtaler denne dagen' : 'Stengt denne dagen'}
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border border-t border-border">
      {day.items.map((item) => {
        if (item.kind === 'appointment') {
          const detail = detailById.get(item.id);
          const href = getAppointmentDetailHref(item.id, returnTo);
          if (detail && !item.cancelled) {
            const marker = isAppointmentInProgress(detail, now)
              ? 'now'
              : detail.id === nextAppointmentId
                ? 'next'
                : new Date(detail.endTime) < now
                  ? 'past'
                  : null;
            return (
              <li key={`appointment-${item.id}`} data-marker={marker ?? undefined}>
                <AppointmentListRow appointment={detail} href={href} marker={marker} />
              </li>
            );
          }
          // Cancelled, or the details didn't load: the same row shape with what the overview knows.
          const name = [detail?.user?.givenName, detail?.user?.familyName].filter(Boolean).join(' ') || 'Avtale';
          return (
            <li key={`appointment-${item.id}`}>
              <Link to={href} className={cn(flatRowClass, 'bg-background opacity-60 hover:bg-surface-variant-1')}>
                <span className="w-14 shrink-0 text-base font-semibold tabular-nums">{item.time}</span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate font-semibold', item.cancelled && 'line-through')}>{name}</span>
                  <span className="block truncate text-sm text-text-secondary">
                    {item.cancelled ? 'Avlyst' : `til ${item.endTime}`}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-text-secondary" aria-hidden />
              </Link>
            </li>
          );
        }

        const absenceBody = (
          <>
            <span className="w-14 shrink-0 text-base font-semibold tabular-nums">{item.time}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Fravær</span>
              <span className="block truncate text-sm text-text-secondary">{item.label}</span>
            </span>
          </>
        );
        const absenceClass = cn(flatRowClass, 'bg-amber-50 shadow-[inset_4px_0_0_var(--color-amber-500)]');
        return (
          <li key={`unavailability-${item.id}`}>
            {item.isPast ? (
              <div className={absenceClass}>{absenceBody}</div>
            ) : (
              <Link to={getUnavailabilityEditHref(item, returnTo)} className={cn(absenceClass, 'hover:bg-amber-100')}>
                {absenceBody}
                <ChevronRight className="size-4 shrink-0 text-text-secondary" aria-hidden />
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
