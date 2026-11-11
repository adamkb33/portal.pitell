import { addDays, addWeeks, format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { CalendarCheck, ChevronLeft, ChevronRight, Gift, Moon, Plus, UserRound } from 'lucide-react';
import type { Route } from './+types/company.booking.schedule.route';
import {
  Booking,
  CompanyUserAppointmentController,
  type AppointmentDto,
  type CompanyUserScheduleOverviewDto,
} from '~/api/generated';
import { formatEstimatedDuration, formatEstimatedPrice } from '~/routes/booking/public/_utils/booking-price';
import { getAppointmentTotals } from '../appointments/_utils/appointments.utils';
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
} from '~/ui';
import { BookingErrorState } from '~/routes/company/booking/_components/booking-error-state';
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

  return (
    <CompanyPageTemplate title="Kalender">
      <BookingDailyToolbar hideChildrenOnPhone>
        <WeekArrow
          label="Forrige uke"
          date={previousWeekStart >= getEarliestScheduleWeekStart() ? previousWeekStart : null}
        >
          <ChevronLeft className="h-4 w-4" />
        </WeekArrow>
        <span className="min-w-16 text-center text-sm font-semibold">
          {format(selectedWeekStart, "'Uke' I", { locale: nb })}
        </span>
        <WeekArrow label="Neste uke" date={nextWeekStart <= getLatestScheduleWeekStart() ? nextWeekStart : null}>
          <ChevronRight className="h-4 w-4" />
        </WeekArrow>
        <span className="hidden text-sm text-text-secondary xl:inline">{formatWeekRange(selectedWeekStart)}</span>
      </BookingDailyToolbar>

      {loaderData.error ? (
        <BookingErrorState className="min-h-[36rem]" />
      ) : (
        <section
          aria-label="Kalender"
          className="flex min-h-[36rem] flex-col overflow-hidden rounded-xl border border-border bg-background p-4 sm:p-5 md:p-0"
        >
          {/* Phone: pick a day, see its times. */}
          <div className="md:hidden">
            <p className="mb-2 text-center text-sm font-semibold">
              {format(selectedWeekStart, "'Uke' I", { locale: nb })}
              <span className="ml-1.5 text-xs font-normal text-text-secondary">
                · {formatWeekRange(selectedWeekStart, true)}
              </span>
            </p>
            <div className="-mx-2 flex items-center gap-0.5">
              <WeekArrow
                bare
                label="Forrige uke"
                date={previousWeekStart >= getEarliestScheduleWeekStart() ? previousWeekStart : null}
              >
                <ChevronLeft className="h-5 w-5" />
              </WeekArrow>
              <div role="group" aria-label="Velg dag" className="grid min-w-0 flex-1 grid-cols-7 gap-1">
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
                      <span
                        aria-hidden
                        className={cn(
                          'mt-1 h-1 w-7 overflow-hidden rounded-full',
                          selected ? 'bg-white/30' : 'bg-slate-200',
                        )}
                      >
                        <span
                          className={cn(
                            'block h-full rounded-full',
                            day.isFull || (day.fill ?? 0) >= 0.8
                              ? 'bg-amber-400'
                              : selected
                                ? 'bg-white'
                                : 'bg-emerald-500',
                          )}
                          style={{ width: `${Math.round((day.fill ?? 0) * 100)}%` }}
                        />
                      </span>
                      {day.isFull ? <span className="sr-only">Fullt</span> : null}
                    </button>
                  );
                })}
              </div>
              <WeekArrow
                bare
                label="Neste uke"
                date={nextWeekStart <= getLatestScheduleWeekStart() ? nextWeekStart : null}
              >
                <ChevronRight className="h-5 w-5" />
              </WeekArrow>
            </div>
            <div className="mt-3">
              <DaySummary day={selectedDay} detailById={detailById} />
              <div className="h-[26rem] overflow-y-auto">
                <DayItems day={selectedDay} returnTo={returnTo} detailById={detailById} />
              </div>
            </div>
          </div>

          {/* Desktop: one list card with a week strip and the selected day's rows. */}
          <div className="hidden md:block">
            <div className="border-b border-border px-4 py-3">
              <div className="flex items-center gap-2" role="group" aria-label="Velg dag">
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
                        'flex min-h-16 min-w-20 flex-1 flex-col items-center justify-center rounded-[var(--radius-control)] px-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive',
                        selected ? 'bg-interactive text-text-inverse' : 'text-text-primary hover:bg-surface-variant-1',
                      )}
                    >
                      <span className={cn('text-xs', selected ? 'text-text-inverse' : 'text-text-secondary')}>
                        {day.label}
                      </span>
                      <span className={cn('font-semibold', day.isToday && !selected && 'text-interactive')}>
                        {format(day.date, 'd')}
                      </span>
                      <span
                        aria-hidden
                        className={cn(
                          'mt-1 h-1 w-10 overflow-hidden rounded-full',
                          selected ? 'bg-white/30' : 'bg-slate-200',
                        )}
                      >
                        <span
                          className={cn(
                            'block h-full rounded-full',
                            day.isFull || (day.fill ?? 0) >= 0.8
                              ? 'bg-amber-400'
                              : selected
                                ? 'bg-white'
                                : 'bg-emerald-500',
                          )}
                          style={{ width: `${Math.round((day.fill ?? 0) * 100)}%` }}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="p-4 sm:p-5">
              <DaySummary day={selectedDay} detailById={detailById} />
              <DayItems day={selectedDay} returnTo={returnTo} detailById={detailById} />
            </div>
          </div>

          <div className="mt-auto pt-4 md:pt-0">
            <div className="border-t border-border pt-3 md:px-4 md:pb-3">
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
          </div>
        </section>
      )}
    </CompanyPageTemplate>
  );
}

function WeekArrow({
  label,
  date,
  children,
  bare = false,
}: {
  label: string;
  date: Date | null;
  children: React.ReactNode;
  bare?: boolean;
}) {
  const bareClass = 'h-11 w-7 shrink-0 rounded-md px-0';
  if (!date) {
    return bare ? (
      <span className={cn(bareClass, 'flex items-center justify-center text-text-disabled')} aria-hidden>
        {children}
      </span>
    ) : (
      <Button type="button" variant="outline" size="icon" aria-label={label} disabled className="h-9 w-9">
        {children}
      </Button>
    );
  }
  return (
    <Button asChild variant={bare ? 'ghost' : 'outline'} size="icon" className={bare ? bareClass : 'h-9 w-9'}>
      <Link to={`?date=${format(date, 'yyyy-MM-dd')}`} aria-label={label}>
        {children}
      </Link>
    </Button>
  );
}

const AVATAR_COLORS = [
  'bg-purple-100 text-purple-900',
  'bg-teal-100 text-teal-900',
  'bg-orange-100 text-orange-900',
  'bg-pink-100 text-pink-900',
];

type DetailById = Map<number, AppointmentDto>;

function customerName(appointment?: AppointmentDto) {
  return [appointment?.user?.givenName, appointment?.user?.familyName].filter(Boolean).join(' ');
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function DaySummary({ day, detailById }: { day: ScheduleDay; detailById: DetailById }) {
  const booked = day.items.filter((item) => item.kind === 'appointment' && !item.cancelled);
  const totals = booked.reduce(
    (sum, item) => {
      const detail = detailById.get(item.id);
      if (!detail) return sum;
      const { duration, price } = getAppointmentTotals(detail);
      return { duration: sum.duration + duration, price: sum.price + price };
    },
    { duration: 0, price: 0 },
  );
  return (
    <div className="mb-3 flex h-7 items-center justify-between gap-3">
      <h3 className="text-base font-semibold first-letter:uppercase">
        {format(day.date, 'EEEE d. MMMM', { locale: nb })}
      </h3>
      <p className="flex items-center gap-2 text-right text-xs text-text-secondary">
        {day.isFull ? (
          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 font-medium text-amber-900">Fullt</span>
        ) : null}
        <span>
          {booked.length} {booked.length === 1 ? 'avtale' : 'avtaler'}
          {totals.price > 0 ? ` · ${formatEstimatedPrice(totals.price)}` : ''}
        </span>
      </p>
    </div>
  );
}

function DayItems({
  day,
  returnTo,
  detailById,
  compact = false,
}: {
  day: ScheduleDay;
  returnTo: string;
  detailById: DetailById;
  compact?: boolean;
}) {
  if (day.items.length === 0) {
    const EmptyIcon = day.isOpen ? CalendarCheck : Moon;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-blue-50 text-interactive">
          <EmptyIcon className="size-7" aria-hidden />
        </span>
        <div className="grid gap-1">
          <p className="text-base font-semibold text-text-primary">
            {day.isOpen ? 'Ingen avtaler denne dagen' : 'Stengt denne dagen'}
          </p>
          <p className="text-sm text-text-secondary">
            {day.isOpen ? 'Dagen er ledig. Nye bestillinger dukker opp her.' : 'Det er ingen åpningstid denne dagen.'}
          </p>
        </div>
      </div>
    );
  }

  const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive';
  let appointmentIndex = -1;

  return (
    <ul className="space-y-2">
      {day.items.map((item) => {
        if (item.kind === 'appointment') {
          appointmentIndex += 1;
          const detail = detailById.get(item.id);
          const name = customerName(detail);
          const { services, duration, price } = detail
            ? getAppointmentTotals(detail)
            : { services: [], duration: 0, price: 0 };
          const serviceNames = services
            .map((service) => service.name)
            .filter(Boolean)
            .join(', ');
          const status = item.cancelled ? 'Avlyst' : item.noShow ? 'Ikke møtt' : null;
          return (
            <li key={`appointment-${item.id}`}>
              <Link
                to={getAppointmentDetailHref(item.id, returnTo)}
                className={cn(
                  'flex min-w-0 items-center gap-3 rounded-xl border border-border bg-background p-3 transition-colors hover:border-interactive/40',
                  focusRing,
                  item.cancelled && 'opacity-60',
                )}
              >
                <span
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                    AVATAR_COLORS[appointmentIndex % AVATAR_COLORS.length],
                  )}
                  aria-hidden
                >
                  {name ? initials(name) : <UserRound className="size-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn('flex items-center gap-1.5 text-sm font-semibold', item.cancelled && 'line-through')}
                  >
                    <span className="truncate">{name || 'Avtale'}</span>
                    {item.loyaltyFreeVisit ? (
                      <Gift className="size-3.5 shrink-0 text-success" aria-label="Gratis time" />
                    ) : null}
                  </span>
                  <span className="block truncate text-xs text-text-secondary">
                    {status ?? (serviceNames || (compact ? '' : 'Ingen tjenester'))}
                    {!compact && !status && price > 0 ? ` · ${formatEstimatedPrice(price)}` : ''}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-semibold tabular-nums">{item.time}</span>
                  <span className="block text-xs text-text-secondary">
                    {duration > 0 ? formatEstimatedDuration(duration) : `til ${item.endTime}`}
                  </span>
                </span>
              </Link>
            </li>
          );
        }

        const absenceBody = (
          <>
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-900"
              aria-hidden
            >
              <span className="size-2 rounded-full bg-amber-600" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Fravær</span>
              <span className="block truncate text-xs text-text-secondary">{item.label}</span>
            </span>
          </>
        );
        const absenceClass = 'flex min-w-0 items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3';
        return (
          <li key={`unavailability-${item.id}`}>
            {item.isPast ? (
              <div className={absenceClass}>{absenceBody}</div>
            ) : (
              <Link to={getUnavailabilityEditHref(item, returnTo)} className={cn(absenceClass, focusRing)}>
                {absenceBody}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function formatWeekRange(weekStart: Date, short = false): string {
  const weekEnd = addDays(weekStart, 6);
  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${format(weekStart, 'd.')}–${format(weekEnd, short ? 'd. MMM' : 'd. MMMM yyyy', { locale: nb })}`;
  }
  return `${format(weekStart, 'd. MMM', { locale: nb })} – ${format(weekEnd, short ? 'd. MMM' : 'd. MMM yyyy', { locale: nb })}`;
}
