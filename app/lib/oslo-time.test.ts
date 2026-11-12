import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { formatCompactDate, formatTime } from './date.utils';
import { formatOslo, formatOsloTime, osloDateKey, osloDateParts, osloDaysFromToday } from './oslo-time';

// The viewer is abroad: every result below must still be shop time (Oslo).
const originalTz = process.env.TZ;
beforeAll(() => {
  process.env.TZ = 'America/New_York';
});
afterAll(() => {
  process.env.TZ = originalTz;
});
afterEach(() => {
  vi.useRealTimers();
});

const setNow = (iso: string) => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
};

describe('shop time for a viewer in New York', () => {
  it('runs in New York', () => {
    expect(new Date('2027-01-15T10:00:00+01:00').getHours()).toBe(4);
  });

  it('shows Oslo wall time whatever offset the string carries', () => {
    expect(formatOsloTime('2027-01-15T10:00:00+01:00')).toBe('10:00');
    expect(formatOsloTime('2027-01-15T09:00:00Z')).toBe('10:00');
    expect(formatOsloTime('2027-07-15T10:00:00+02:00')).toBe('10:00');
    expect(formatTime('2027-07-15T08:00:00Z')).toBe('10:00');
  });

  it('puts a just-after-midnight appointment on the Oslo day', () => {
    // 00:30 in Oslo is still the previous evening in New York.
    expect(osloDateKey('2027-01-16T00:30:00+01:00')).toBe('2027-01-16');
    expect(osloDateParts('2027-01-16T00:30:00+01:00')).toEqual({ year: 2027, monthIndex: 0, day: 16, weekday: 6 });
    expect(formatOslo('2027-01-16T00:30:00+01:00', { month: 'short' })).toMatch(/^jan/);
  });
});

describe('today and tomorrow across Norwegian summer time changes', () => {
  it('spring forward (23 hour day, 2027-03-28)', () => {
    setNow('2027-03-27T20:00:00+01:00');
    expect(osloDaysFromToday('2027-03-28T10:00:00+02:00')).toBe(1);
    expect(formatCompactDate('2027-03-28T10:00:00+02:00').day).toBe('I morgen');
    expect(formatCompactDate('2027-03-27T23:30:00+01:00').day).toBe('I dag');
  });

  it('fall back (25 hour day, 2027-10-31)', () => {
    setNow('2027-10-30T20:00:00+02:00');
    expect(osloDaysFromToday('2027-10-31T10:00:00+01:00')).toBe(1);
    expect(formatCompactDate('2027-10-31T10:00:00+01:00').day).toBe('I morgen');
    // 02:30 happens twice that night; both are the same Oslo day.
    expect(osloDateKey('2027-10-31T02:30:00+02:00')).toBe('2027-10-31');
    expect(osloDateKey('2027-10-31T02:30:00+01:00')).toBe('2027-10-31');
  });

  it('late evening in Oslo is already tomorrow in Oslo terms, not New York', () => {
    // 23:30 Oslo on the 15th = 17:30 in New York on the 15th; the appointment at 09:00 Oslo on the 16th is tomorrow.
    setNow('2027-01-15T23:30:00+01:00');
    expect(formatCompactDate('2027-01-16T09:00:00+01:00').day).toBe('I morgen');
    setNow('2027-01-16T00:30:00+01:00');
    expect(formatCompactDate('2027-01-16T09:00:00+01:00').day).toBe('I dag');
  });
});
