import { addWeeks, endOfWeek, format, startOfWeek } from 'date-fns';
import { formatDateInputInTimeZone } from '~/lib/query';
import type { Weekday } from '../_types/schedule.types';

export const PAST_WEEK_NAVIGATION_LIMIT = 4;
export const FUTURE_WEEK_NAVIGATION_LIMIT = 4;

export const WEEKDAY: Record<number, Weekday> = {
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
};

export function toWeekRange(date: string) {
  const selected = new Date(`${date}T00:00:00`);
  const start = startOfWeek(selected, { weekStartsOn: 1 });
  const end = endOfWeek(selected, { weekStartsOn: 1 });
  return { fromDate: format(start, 'yyyy-MM-dd'), toDate: format(end, 'yyyy-MM-dd') };
}

export function toWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function getEarliestScheduleWeekStart(today = new Date()): Date {
  return addWeeks(toWeekStart(today), -PAST_WEEK_NAVIGATION_LIMIT);
}

export function getLatestScheduleWeekStart(today = new Date()): Date {
  return addWeeks(toWeekStart(today), FUTURE_WEEK_NAVIGATION_LIMIT);
}

/** The day to show: the one in the URL (kept within the navigable weeks), or today in Oslo when there is none. */
export function toSafeScheduleDate(rawDate: string | null): string {
  const today = new Date(`${formatDateInputInTimeZone(new Date())}T00:00:00`);
  const earliestWeekStart = getEarliestScheduleWeekStart(today);
  const latestWeekStart = getLatestScheduleWeekStart(today);
  const parsed = rawDate ? new Date(`${rawDate}T00:00:00`) : today;
  const requestedDate = Number.isNaN(parsed.getTime()) ? today : parsed;
  const requestedWeekStart = toWeekStart(requestedDate);
  const clamped =
    requestedWeekStart < earliestWeekStart
      ? earliestWeekStart
      : requestedWeekStart > latestWeekStart
        ? latestWeekStart
        : requestedWeekStart;
  const safeDate = requestedWeekStart.getTime() === clamped.getTime() ? requestedDate : clamped;
  return format(safeDate, 'yyyy-MM-dd');
}
