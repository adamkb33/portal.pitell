import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { Link } from 'react-router';
import type { AppointmentDto, CompanyUserScheduleOverviewDto } from '~/api/generated';
import { cn, Popover, PopoverContent, PopoverTrigger } from '~/ui';
import { formatEstimatedDuration, formatEstimatedPrice } from '~/routes/booking/public/_utils/booking-price';
import { getAppointmentTotals } from '../../appointments/_utils/appointments.utils';
import { getAppointmentDetailHref, getUnavailabilityEditHref, type ScheduleDay } from '../_utils/schedule-days';

const PX_PER_HOUR = 56;
const MIN_BLOCK = 22;
const BLOCK_COLORS = [
  'bg-purple-100 text-purple-950',
  'bg-teal-100 text-teal-950',
  'bg-orange-100 text-orange-950',
  'bg-pink-100 text-pink-950',
];

const toMinutes = (clock: string) => {
  const [hours, minutes] = clock.split(':');
  return Number(hours) * 60 + Number(minutes ?? 0);
};

function getHourRange(overview: CompanyUserScheduleOverviewDto, days: ScheduleDay[]) {
  const starts: number[] = [];
  const ends: number[] = [];
  for (const schedule of overview.dailySchedules) {
    starts.push(toMinutes(schedule.startTime));
    ends.push(toMinutes(schedule.endTime));
  }
  for (const day of days) {
    for (const item of day.items) {
      if (item.kind === 'appointment') {
        starts.push(toMinutes(item.time));
        ends.push(toMinutes(item.endTime));
      }
    }
  }
  const start = starts.length ? Math.floor(Math.min(...starts) / 60) : 8;
  const end = ends.length ? Math.ceil(Math.max(...ends) / 60) : 16;
  return { start: Math.max(0, start), end: Math.min(24, Math.max(end, start + 4)) };
}

function customerName(appointment?: AppointmentDto) {
  return [appointment?.user?.givenName, appointment?.user?.familyName].filter(Boolean).join(' ');
}

export function WeekGrid({
  days,
  overview,
  detailById,
  returnTo,
}: {
  days: ScheduleDay[];
  overview: CompanyUserScheduleOverviewDto;
  detailById: Map<number, AppointmentDto>;
  returnTo: string;
}) {
  const range = getHourRange(overview, days);
  const hours = Array.from({ length: range.end - range.start }, (_, i) => range.start + i);
  const height = hours.length * PX_PER_HOUR;
  const toTop = (clock: string) => ((toMinutes(clock) - range.start * 60) / 60) * PX_PER_HOUR;
  let colorIndex = -1;

  return (
    <div>
      <div className="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))]">
        <div className="border-b border-border" />
        {days.map((day) => (
          <div
            key={day.key}
            className={cn(
              'border-b border-l border-border px-2 py-2 text-center',
              day.isToday && 'bg-interactive text-text-inverse',
              day.isFull && !day.isToday && 'bg-amber-50',
              !day.isOpen && !day.isToday && 'bg-slate-50 text-text-disabled',
            )}
          >
            <div className="flex items-baseline justify-center gap-1.5 text-sm">
              <span className={cn('text-xs', day.isToday ? 'text-text-inverse' : 'text-text-secondary')}>
                {day.label}
              </span>
              <span className="font-semibold">{format(day.date, 'd')}</span>
              {day.isFull ? (
                <span className="rounded bg-amber-100 px-1 text-[10px] font-medium text-amber-900">Fullt</span>
              ) : null}
            </div>
            <div className={cn('text-[11px]', day.isToday ? 'text-text-inverse' : 'text-text-secondary')}>
              {!day.isOpen ? 'Stengt' : day.bookedCount === 0 ? 'Ingen timer' : `${day.bookedCount} avt.`}
            </div>
          </div>
        ))}

        <div className="relative" style={{ height }} aria-hidden>
          {hours.map((hour, index) => (
            <span
              key={hour}
              className="absolute right-1.5 text-[11px] tabular-nums text-text-secondary"
              style={{ top: index * PX_PER_HOUR - (index === 0 ? 0 : 7) }}
            >
              {String(hour).padStart(2, '0')}
            </span>
          ))}
        </div>

        {days.map((day) => (
          <div
            key={day.key}
            className={cn('relative border-l border-border', !day.isOpen && 'bg-slate-50')}
            style={{
              height,
              backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${PX_PER_HOUR - 1}px, var(--color-border) ${PX_PER_HOUR - 1}px, var(--color-border) ${PX_PER_HOUR}px)`,
            }}
          >
            {day.items.map((item) => {
              if (item.kind === 'appointment') {
                colorIndex += 1;
                const detail = detailById.get(item.id);
                const name = customerName(detail) || 'Avtale';
                const top = Math.max(0, toTop(item.time));
                const blockHeight = Math.max(MIN_BLOCK, toTop(item.endTime) - toTop(item.time));
                const { services, duration, price } = detail
                  ? getAppointmentTotals(detail)
                  : { services: [], duration: 0, price: 0 };
                const serviceNames = services
                  .map((service) => service.name)
                  .filter(Boolean)
                  .join(', ');
                return (
                  <Popover key={`a-${item.id}`}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          'absolute inset-x-0.5 overflow-hidden rounded-md px-1.5 py-0.5 text-left text-xs leading-tight transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive',
                          BLOCK_COLORS[colorIndex % BLOCK_COLORS.length],
                          item.cancelled && 'opacity-50 line-through',
                        )}
                        style={{ top, height: blockHeight - 2 }}
                      >
                        <span className="block truncate font-semibold">{name}</span>
                        {blockHeight >= 38 ? (
                          <span className="block truncate opacity-80">{serviceNames || item.time}</span>
                        ) : null}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 space-y-2 p-4" align="start">
                      <div>
                        <p className="font-semibold">{name}</p>
                        <p className="text-sm text-text-secondary">
                          {format(day.date, 'EEEE d. MMMM', { locale: nb })} · {item.time}–{item.endTime}
                          {duration > 0 ? ` · ${formatEstimatedDuration(duration)}` : ''}
                        </p>
                      </div>
                      {item.loyaltyFreeVisit ? (
                        <p className="rounded-md bg-success-soft px-2 py-1 text-sm text-success">Gratis besøk</p>
                      ) : null}
                      {item.cancelled ? <p className="text-sm text-text-secondary">Avlyst</p> : null}
                      {item.noShow ? <p className="text-sm text-text-secondary">Ikke møtt</p> : null}
                      {serviceNames ? (
                        <p className="text-sm">
                          {serviceNames}
                          {price > 0 ? ` · ${formatEstimatedPrice(price)}` : ''}
                        </p>
                      ) : null}
                      <Link
                        to={getAppointmentDetailHref(item.id, returnTo)}
                        className="inline-flex min-h-9 items-center text-sm font-medium text-interactive hover:underline"
                      >
                        Åpne avtalen
                      </Link>
                    </PopoverContent>
                  </Popover>
                );
              }

              const top = Math.max(0, toTop(item.time));
              const bottom = Math.min(height, toTop(item.until === '24:00' ? `${range.end}:00` : item.until));
              const className =
                'absolute inset-x-0.5 overflow-hidden rounded-md border border-dashed border-amber-500 bg-amber-50 px-1.5 py-0.5 text-xs leading-tight text-amber-950';
              const style = { top, height: Math.max(MIN_BLOCK, bottom - top) - 2 };
              return item.isPast ? (
                <div key={`u-${item.id}`} className={className} style={style}>
                  <span className="block truncate font-semibold">Fravær</span>
                </div>
              ) : (
                <Link
                  key={`u-${item.id}`}
                  to={getUnavailabilityEditHref(item, returnTo)}
                  className={cn(
                    className,
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive',
                  )}
                  style={style}
                >
                  <span className="block truncate font-semibold">Fravær</span>
                  {style.height >= 38 ? <span className="block truncate opacity-80">{item.label}</span> : null}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
