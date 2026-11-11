import { describe, expect, it } from 'vitest';
import { groupServiceMetrics } from './group-service-metrics';
import { busyTimeLabel, compareWithPrevious, formatKr, monthHref, monthTitle, readMonth, shiftMonth } from './month';

describe('statistics month helpers', () => {
  it('reads only real months from the URL', () => {
    expect(readMonth(new URL('http://x/s?maned=2026-10'))).toBe('2026-10');
    expect(readMonth(new URL('http://x/s?maned=2026-13'))).toBeNull();
    expect(readMonth(new URL('http://x/s?maned=okt'))).toBeNull();
    expect(readMonth(new URL('http://x/s'))).toBeNull();
  });

  it('steps across the new year', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2025-12', 1)).toBe('2026-01');
    expect(shiftMonth('2026-11', -1)).toBe('2026-10');
  });

  it('names months and links the current month without a parameter', () => {
    expect(monthTitle('2026-11')).toBe('November 2026');
    expect(monthHref('/s', '2026-11', '2026-11')).toBe('/s');
    expect(monthHref('/s', '2026-10', '2026-11')).toBe('/s?maned=2026-10');
  });

  it('compares with the month before in one short line', () => {
    const words = { more: 'høyere', less: 'lavere' };
    expect(compareWithPrevious(17900, 26650, '2026-10', words)).toBe('33 % lavere enn oktober');
    expect(compareWithPrevious(95, 54, '2026-10', { more: 'flere', less: 'færre' })).toBe('76 % flere enn oktober');
    expect(compareWithPrevious(100, 100, '2026-10', words)).toBe('Som i oktober');
    expect(compareWithPrevious(100, 0, '2026-10', words)).toBeNull();
  });

  it('formats kroner and busy times', () => {
    expect(formatKr(17900)).toBe('17 900 kr');
    expect(formatKr(487.6)).toBe('488 kr');
    expect(busyTimeLabel(1, 9)).toBe('mandag kl. 09');
  });
});

describe('groupServiceMetrics', () => {
  const service = (serviceId: number, groupId: number, groupName: string, revenue: number) => ({
    serviceId,
    serviceName: `Tjeneste ${serviceId}`,
    groupId,
    groupName,
    appointments: 1,
    revenue,
  });

  it('puts the group with most omsetning first and keeps the Tjenester page colors', () => {
    const groups = groupServiceMetrics(
      [service(13, 5, 'Barn', 48000), service(15, 7, 'Menn', 28800), service(16, 7, 'Menn', 23800)],
      [5, 6, 7],
    );
    expect(groups.map((group) => [group.groupName, group.revenue, group.colorPosition])).toEqual([
      ['Menn', 52600, 2],
      ['Barn', 48000, 0],
    ]);
  });

  it('falls back to group id order', () => {
    const groups = groupServiceMetrics([service(1, 9, 'B', 10), service(2, 3, 'A', 10)], []);
    expect(groups.map((group) => [group.groupName, group.colorPosition])).toEqual([
      ['A', 0],
      ['B', 1],
    ]);
  });
});

describe('day calendar', () => {
  it('starts weeks on Monday and pads the month to whole weeks', async () => {
    const { calendarWeeks } = await import('../_components/day-calendar');
    const days = Array.from({ length: 30 }, (_, index) => ({
      date: `2026-11-${String(index + 1).padStart(2, '0')}`,
      count: index,
    }));
    const weeks = calendarWeeks(days);
    // 1 November 2026 is a Sunday.
    expect(weeks[0].slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(weeks[0][6]?.date).toBe('2026-11-01');
    expect(weeks.at(-1)?.[0]?.date).toBe('2026-11-30');
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });

  it('shades by fixed steps and knows today in Oslo', async () => {
    const { dayLevel, osloToday } = await import('../_components/day-calendar');
    expect([0, 1, 2, 3, 4, 5, 7, 8, 27].map(dayLevel)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
    // 23:30 UTC on 31 October is already 1 November in Oslo.
    expect(osloToday(new Date('2026-10-31T23:30:00Z'))).toBe('2026-11-01');
  });
});
