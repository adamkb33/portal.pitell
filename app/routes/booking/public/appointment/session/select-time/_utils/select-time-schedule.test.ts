import { describe, expect, it } from 'vitest';
import type { ScheduleDto } from '~/api/generated';
import { buildBookingDays, findNextAvailableDay } from './select-time-schedule';

const schedule = (date: string, slotCount: number): ScheduleDto => ({
  profileId: 1,
  date,
  timeSlots: Array.from({ length: slotCount }, (_, index) => ({
    startTime: `${date}T1${index}:00:00+01:00`,
    endTime: `${date}T1${index}:15:00+01:00`,
  })),
});

describe('booking day row', () => {
  const days = buildBookingDays([schedule('2026-11-05', 2), schedule('2026-11-03', 0), schedule('2026-11-07', 1)]);

  it('lists every day from the first to the last schedule, marking days without times', () => {
    expect(days.map((day) => [day.key, day.isAvailable])).toEqual([
      ['2026-11-03', false],
      ['2026-11-04', false],
      ['2026-11-05', true],
      ['2026-11-06', false],
      ['2026-11-07', true],
    ]);
  });

  it('finds the next free day after a fully booked one', () => {
    expect(findNextAvailableDay(days, '2026-11-03')?.key).toBe('2026-11-05');
    expect(findNextAvailableDay(days, '2026-11-07')).toBeNull();
  });

  it('is empty without schedules', () => {
    expect(buildBookingDays([])).toEqual([]);
  });
});
