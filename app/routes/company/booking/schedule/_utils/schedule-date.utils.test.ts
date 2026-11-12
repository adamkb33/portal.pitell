import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { format } from 'date-fns';
import {
  FUTURE_WEEK_NAVIGATION_LIMIT,
  getEarliestScheduleWeekStart,
  getLatestScheduleWeekStart,
  PAST_WEEK_NAVIGATION_LIMIT,
  toSafeScheduleDate,
  toWeekRange,
} from './schedule-date.utils';

describe('schedule date utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-08T12:00:00+02:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens on today when no date is supplied', () => {
    expect(toSafeScheduleDate(null)).toBe('2026-07-08');
  });

  it('preserves the selected day within an allowed week', () => {
    expect(toSafeScheduleDate('2026-07-08')).toBe('2026-07-08');
  });

  it('allows exactly four weeks of future navigation', () => {
    expect(FUTURE_WEEK_NAVIGATION_LIMIT).toBe(4);
    expect(toSafeScheduleDate('2026-08-03')).toBe('2026-08-03');
    expect(format(getLatestScheduleWeekStart(), 'yyyy-MM-dd')).toBe('2026-08-03');
  });

  it('clamps dates newer than four weeks to the latest allowed week', () => {
    expect(toSafeScheduleDate('2026-08-20')).toBe('2026-08-03');
  });

  it('allows exactly four weeks of past navigation', () => {
    expect(PAST_WEEK_NAVIGATION_LIMIT).toBe(4);
    expect(toSafeScheduleDate('2026-06-08')).toBe('2026-06-08');
    expect(format(getEarliestScheduleWeekStart(), 'yyyy-MM-dd')).toBe('2026-06-08');
  });

  it('clamps dates older than four weeks to the earliest allowed week', () => {
    expect(toSafeScheduleDate('2026-06-01')).toBe('2026-06-08');
  });

  it('falls back to today for invalid dates', () => {
    expect(toSafeScheduleDate('not-a-date')).toBe('2026-07-08');
  });

  it('returns monday-sunday range for the selected week', () => {
    expect(toWeekRange('2026-07-08')).toEqual({
      fromDate: '2026-07-06',
      toDate: '2026-07-12',
    });
  });
});
