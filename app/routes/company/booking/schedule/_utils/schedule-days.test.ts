import { describe, expect, it } from 'vitest';
import type { CompanyUserScheduleOverviewDto } from '~/api/generated';
import type { ScheduleWeekDay } from '../_types/schedule.types';
import { buildScheduleDays } from './schedule-days';

const day = (key: string, dayOfWeek: ScheduleWeekDay['dayOfWeek']): ScheduleWeekDay => ({
  date: new Date(`${key}T00:00:00`),
  key,
  dayOfWeek,
  label: key,
  isToday: false,
  isPast: false,
});

const week = [day('2026-11-02', 'MONDAY'), day('2026-11-03', 'TUESDAY'), day('2026-11-08', 'SUNDAY')];

const overview = (partial: Partial<CompanyUserScheduleOverviewDto>): CompanyUserScheduleOverviewDto => ({
  profileId: 1,
  dailySchedules: [
    { id: 1, dayOfWeek: 'MONDAY', startTime: '10:00', endTime: '19:00' },
    { id: 2, dayOfWeek: 'TUESDAY', startTime: '10:00', endTime: '19:00' },
  ],
  appointments: [],
  unavailabilities: [],
  availabilities: [],
  ...partial,
});

describe('buildScheduleDays', () => {
  it('puts appointments on their Oslo day in time order and marks closed days', () => {
    const days = buildScheduleDays(
      overview({
        appointments: [
          {
            id: 2,
            profileId: 1,
            userId: 9,
            startTime: '2026-11-02T10:15:00+01:00',
            endTime: '2026-11-02T10:30:00+01:00',
            noShow: false,
            loyaltyFreeVisit: false,
          },
          {
            id: 1,
            profileId: 1,
            userId: 8,
            startTime: '2026-11-02T10:00:00+01:00',
            endTime: '2026-11-02T10:15:00+01:00',
            noShow: false,
            loyaltyFreeVisit: false,
          },
        ],
      }),
      week,
    );

    expect(days[0].items.map((item) => item.time)).toEqual(['10:00', '10:15']);
    expect(days[1]).toMatchObject({ isOpen: true, items: [] });
    expect(days[2]).toMatchObject({ isOpen: false, items: [] });
  });

  it('shows a multi-day absence on every day it covers', () => {
    const days = buildScheduleDays(
      overview({
        unavailabilities: [
          { id: 5, profileId: 1, startTime: '2026-11-02T13:00:00+01:00', endTime: '2026-11-04T00:00:00+01:00' },
        ],
      }),
      week,
    );

    expect(days[0].items).toMatchObject([{ kind: 'unavailability', label: 'fra 13:00' }]);
    expect(days[1].items).toMatchObject([{ kind: 'unavailability', label: 'hele dagen' }]);
    expect(days[2].items).toEqual([]);
  });

  it('counts extra bookable time as an open day', () => {
    const days = buildScheduleDays(
      overview({
        availabilities: [
          { id: 3, profileId: 1, startTime: '2026-11-08T12:00:00+01:00', endTime: '2026-11-08T15:00:00+01:00' },
        ],
      }),
      week,
    );

    expect(days[2].isOpen).toBe(true);
  });
});
