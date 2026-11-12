import { describe, expect, it } from 'vitest';
import type { ScheduleUnavailabilityGroupDto } from '~/api/generated';
import { absenceLine, absenceTitle, isPastAbsence } from './absence';

const slot = (id: number, startTime: string, endTime: string) => ({ id, startTime, endTime });
const group = (from: string, to: string, blockedSlots: ReturnType<typeof slot>[]) =>
  ({
    id: 'g',
    profileId: 1,
    from,
    to,
    ids: blockedSlots.map((s) => s.id),
    blockedSlots,
  }) as ScheduleUnavailabilityGroupDto;

describe('absence', () => {
  it('describes a whole-day absence over several days', () => {
    const christmas = group('2026-12-24T00:00:00+01:00', '2026-12-26T23:59:00+01:00', [
      slot(1, '2026-12-24T00:00:00+01:00', '2026-12-24T23:59:00+01:00'),
      slot(2, '2026-12-25T00:00:00+01:00', '2026-12-25T23:59:00+01:00'),
      slot(3, '2026-12-26T00:00:00+01:00', '2026-12-26T23:59:00+01:00'),
    ]);
    expect(absenceTitle(christmas)).toBe('24.–26. des.');
    expect(absenceLine(christmas)).toBe('Hele dagen');
  });

  it('counts an end at midnight as the day before', () => {
    const day = group('2026-12-24T00:00:00+01:00', '2026-12-25T00:00:00+01:00', [
      slot(1, '2026-12-24T00:00:00+01:00', '2026-12-25T00:00:00+01:00'),
    ]);
    expect(absenceTitle(day)).toBe('Torsdag 24. des.');
  });

  it('describes a break on one day', () => {
    const lunch = group('2026-11-16T12:00:00+01:00', '2026-11-16T13:00:00+01:00', [
      slot(1, '2026-11-16T12:00:00+01:00', '2026-11-16T13:00:00+01:00'),
    ]);
    expect(absenceTitle(lunch)).toBe('Mandag 16. nov.');
    expect(absenceLine(lunch)).toBe('12:00–13:00');
  });

  it('says "hver dag" for the same break on several days, and "Ulike tider" when they differ', () => {
    const same = group('2026-11-16T12:00:00+01:00', '2026-11-17T13:00:00+01:00', [
      slot(1, '2026-11-16T12:00:00+01:00', '2026-11-16T13:00:00+01:00'),
      slot(2, '2026-11-17T12:00:00+01:00', '2026-11-17T13:00:00+01:00'),
    ]);
    expect(absenceLine(same)).toBe('12:00–13:00 hver dag');
    const mixed = group('2026-11-16T12:00:00+01:00', '2026-11-17T14:00:00+01:00', [
      slot(1, '2026-11-16T12:00:00+01:00', '2026-11-16T13:00:00+01:00'),
      slot(2, '2026-11-17T13:00:00+01:00', '2026-11-17T14:00:00+01:00'),
    ]);
    expect(absenceLine(mixed)).toBe('Ulike tider');
  });

  it('knows when an absence is over', () => {
    const lunch = group('2026-11-16T12:00:00+01:00', '2026-11-16T13:00:00+01:00', []);
    expect(isPastAbsence(lunch, new Date('2026-11-17T00:00:00+01:00').getTime())).toBe(true);
    expect(isPastAbsence(lunch, new Date('2026-11-16T12:30:00+01:00').getTime())).toBe(false);
  });
});
