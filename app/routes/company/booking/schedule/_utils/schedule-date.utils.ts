import { addWeeks, endOfWeek, format, startOfWeek } from 'date-fns';
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

export function toSafeScheduleDate(rawDate: string | null): string {
  const today = new Date();
  const currentWeekStart = toWeekStart(today);
  const earliestWeekStart = getEarliestScheduleWeekStart(today);
  const latestWeekStart = getLatestScheduleWeekStart(today);
  const parsed = rawDate ? new Date(`${rawDate}T00:00:00`) : today;
  const requestedDate = !rawDate || Number.isNaN(parsed.getTime()) ? currentWeekStart : parsed;
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
