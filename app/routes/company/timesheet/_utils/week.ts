import { addMonths, endOfWeek, format, getISOWeek, parseISO, startOfWeek, subMonths } from 'date-fns';
import type { GetTimesheetEntriesRequest, TimesheetDayEntryDto } from '~/api/generated/timesheet';
import type { WeekSummary } from '../_types/timesheet.types';

const WEEK_STARTS_ON = 1 as const;
const NAV_MONTHS_DELTA = 1;

export const resolveWeekWindow = (weekStartParam?: string | null) => {
  const referenceDate = weekStartParam ? new Date(weekStartParam) : new Date();
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: WEEK_STARTS_ON });
  const weekEnd = endOfWeek(referenceDate, { weekStartsOn: WEEK_STARTS_ON });

  return { weekStart, weekEnd };
};

export const buildWeekEntriesRequest = (weekStart: Date, weekEnd: Date): GetTimesheetEntriesRequest => ({
  page: 0,
  size: 100,
  sortBy: 'date',
  sortDirection: 'ASC',
  fromDate: format(weekStart, 'yyyy-MM-dd'),
  toDate: format(weekEnd, 'yyyy-MM-dd'),
});

export const toWeekSummary = (weekStart: Date, weekEnd: Date, entries: TimesheetDayEntryDto[]): WeekSummary => ({
  weekNumber: getISOWeek(weekStart),
  startDate: weekStart.toISOString(),
  endDate: weekEnd.toISOString(),
  entries,
});

export const getWeekNavigationState = (weekStartIso?: string) => {
  const currentWeekStart = weekStartIso ? startOfWeek(parseISO(weekStartIso), { weekStartsOn: WEEK_STARTS_ON }) : null;
  const minAllowedWeekStart = startOfWeek(subMonths(new Date(), NAV_MONTHS_DELTA), { weekStartsOn: WEEK_STARTS_ON });
  const maxAllowedWeekStart = startOfWeek(addMonths(new Date(), NAV_MONTHS_DELTA), { weekStartsOn: WEEK_STARTS_ON });
  const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: WEEK_STARTS_ON });

  return {
    currentWeekStart,
    minAllowedWeekStart,
    maxAllowedWeekStart,
    thisWeekStart,
    canGoPrev: currentWeekStart ? currentWeekStart > minAllowedWeekStart : false,
    canGoNext: currentWeekStart ? currentWeekStart < maxAllowedWeekStart : false,
    isViewingThisWeek: currentWeekStart ? currentWeekStart.getTime() === thisWeekStart.getTime() : true,
  };
};
