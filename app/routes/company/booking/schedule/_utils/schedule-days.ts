import { formatInTimeZone } from 'date-fns-tz';
import type { CompanyUserScheduleOverviewDto } from '~/api/generated';
import { DEFAULT_QUERY_TIMEZONE } from '~/lib/query';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import type { ScheduleWeekDay } from '../_types/schedule.types';

export type ScheduleDayItem =
  | {
      kind: 'appointment';
      id: number;
      time: string;
      endTime: string;
      cancelled: boolean;
      noShow: boolean;
      loyaltyFreeVisit: boolean;
    }
  | {
      kind: 'unavailability';
      id: number;
      time: string;
      /** "11:00–13:00", "fra 13:00", "til 12:00" or "hele dagen", as seen from this day. */
      label: string;
      /** The absence's end on this day, "24:00" when it runs past midnight. */
      until: string;
      startTime: string;
      endTime: string;
      isPast: boolean;
    };

export type ScheduleDay = ScheduleWeekDay & {
  /** Has opening hours or extra bookable time, so an empty day reads "Ingen timer" rather than "Stengt". */
  isOpen: boolean;
  items: ScheduleDayItem[];
  /** Booked time divided by open time, 0 to 1. Null when the day has no opening hours. */
  fill: number | null;
  /** All open time is booked. */
  isFull: boolean;
  /** Appointments that count (not cancelled). */
  bookedCount: number;
};

const toDayKey = (dateTime: string | Date) => formatInTimeZone(dateTime, DEFAULT_QUERY_TIMEZONE, 'yyyy-MM-dd');
const toClock = (dateTime: string | Date) => formatInTimeZone(dateTime, DEFAULT_QUERY_TIMEZONE, 'HH:mm');

export function buildScheduleDays(
  overview: CompanyUserScheduleOverviewDto,
  weekDays: ScheduleWeekDay[],
  now = new Date(),
): ScheduleDay[] {
  return weekDays.map((day) => {
    const appointments: ScheduleDayItem[] = overview.appointments
      .filter((appointment) => toDayKey(appointment.startTime) === day.key)
      .map((appointment) => ({
        kind: 'appointment',
        id: appointment.id,
        time: toClock(appointment.startTime),
        endTime: toClock(appointment.endTime),
        cancelled: Boolean(appointment.cancelledAt),
        noShow: appointment.noShow,
        loyaltyFreeVisit: Boolean(appointment.loyaltyFreeVisit),
      }));

    // An absence can span several days, so it shows on every day it touches.
    const absences: ScheduleDayItem[] = overview.unavailabilities.flatMap((unavailability) => {
      const firstDay = toDayKey(unavailability.startTime);
      const lastDay = toDayKey(new Date(new Date(unavailability.endTime).getTime() - 1));
      if (day.key < firstDay || day.key > lastDay) return [];

      const from = day.key === firstDay ? toClock(unavailability.startTime) : '00:00';
      const to = day.key === toDayKey(unavailability.endTime) ? toClock(unavailability.endTime) : '24:00';
      return [
        {
          kind: 'unavailability',
          id: unavailability.id,
          time: from,
          label: toAbsenceLabel(from, to),
          until: to,
          startTime: unavailability.startTime,
          endTime: unavailability.endTime,
          isPast: new Date(unavailability.endTime) < now,
        },
      ];
    });

    const { fill, bookedCount } = computeFill(overview, day);

    const isOpen =
      overview.dailySchedules.some((schedule) => schedule.dayOfWeek === day.dayOfWeek) ||
      overview.availabilities.some((availability) => toDayKey(availability.startTime) === day.key);

    return {
      ...day,
      isOpen,
      fill,
      isFull: fill !== null && fill >= 0.99,
      bookedCount,
      items: [...absences, ...appointments].sort((a, b) => a.time.localeCompare(b.time)),
    };
  });
}

const toMinutes = (clock: string) => {
  const [hours, minutes] = clock.split(':');
  return Number(hours) * 60 + Number(minutes ?? 0);
};

const minutesBetween = (from: string | Date, to: string | Date) =>
  Math.max(0, (new Date(to).getTime() - new Date(from).getTime()) / 60000);

/** Booked minutes over open minutes for one day. Open time = opening hours + extra bookable time - absences. */
function computeFill(overview: CompanyUserScheduleOverviewDto, day: ScheduleWeekDay) {
  const regular = overview.dailySchedules
    .filter((schedule) => schedule.dayOfWeek === day.dayOfWeek)
    .reduce((sum, schedule) => sum + Math.max(0, toMinutes(schedule.endTime) - toMinutes(schedule.startTime)), 0);
  const extra = overview.availabilities
    .filter((availability) => toDayKey(availability.startTime) === day.key)
    .reduce((sum, availability) => sum + minutesBetween(availability.startTime, availability.endTime), 0);
  const absent = overview.unavailabilities.reduce((sum, unavailability) => {
    const firstDay = toDayKey(unavailability.startTime);
    const lastDay = toDayKey(new Date(new Date(unavailability.endTime).getTime() - 1));
    if (day.key < firstDay || day.key > lastDay) return sum;
    const from = day.key === firstDay ? toMinutes(toClock(unavailability.startTime)) : 0;
    const to = day.key === toDayKey(unavailability.endTime) ? toMinutes(toClock(unavailability.endTime)) : 1440;
    return sum + Math.max(0, to - from);
  }, 0);

  const booked = overview.appointments.filter(
    (appointment) => !appointment.cancelledAt && toDayKey(appointment.startTime) === day.key,
  );
  const bookedMinutes = booked.reduce(
    (sum, appointment) => sum + minutesBetween(appointment.startTime, appointment.endTime),
    0,
  );
  const capacity = Math.max(0, regular + extra - absent);

  return { fill: capacity > 0 ? Math.min(1, bookedMinutes / capacity) : null, bookedCount: booked.length };
}

function toAbsenceLabel(from: string, to: string): string {
  if (from === '00:00' && to === '24:00') return 'hele dagen';
  if (to === '24:00') return `fra ${from}`;
  if (from === '00:00') return `til ${to}`;
  return `${from}–${to}`;
}

export function getAppointmentDetailHref(appointmentId: number, returnTo?: string): string {
  const href = ROUTES_MAP['company.booking.appointments.detail'].href.replace(':appointmentId', String(appointmentId));
  return returnTo ? `${href}?from=kalender&returnTo=${encodeURIComponent(returnTo)}` : href;
}

export function getUnavailabilityEditHref(
  item: Extract<ScheduleDayItem, { kind: 'unavailability' }>,
  returnTo: string,
): string {
  const params = new URLSearchParams({ from: item.startTime, to: item.endTime, redirectTo: returnTo });
  return `${ROUTES_MAP['company.booking.schedule-unavailability.create'].href}?${params.toString()}`;
}
