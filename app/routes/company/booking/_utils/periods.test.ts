import { describe, expect, it } from 'vitest';
import { dayRangeTitle, dayTitle, durationLabel, groupByMonth, monthLabel, periodWindow, readPeriod } from './periods';

const d = (value: string) => new Date(`${value}T12:00:00`);

describe('periods', () => {
  it('reads the period from the URL, kommende by default', () => {
    expect(readPeriod(new URL('http://x/?periode=tidligere'))).toBe('tidligere');
    expect(readPeriod(new URL('http://x/'))).toBe('kommende');
    expect(readPeriod(new URL('http://x/?periode=noe'))).toBe('kommende');
  });

  it('looks 12 months ahead for kommende and 6 months back for tidligere', () => {
    const now = d('2026-11-07');
    expect(periodWindow('kommende', now).end.getFullYear()).toBe(2027);
    expect(periodWindow('kommende', now).end.getMonth()).toBe(10);
    expect(periodWindow('tidligere', now).start.getMonth()).toBe(4);
  });

  it('formats Norwegian titles', () => {
    expect(monthLabel(d('2026-11-14'))).toBe('November 2026');
    expect(dayTitle(d('2026-11-14'))).toBe('Lørdag 14. nov.');
    expect(dayRangeTitle(d('2026-12-24'), d('2026-12-26'))).toBe('24.–26. des.');
    expect(dayRangeTitle(d('2026-11-30'), d('2026-12-02'))).toBe('30. nov.–2. des.');
    expect(dayRangeTitle(d('2026-12-30'), d('2027-01-02'))).toBe('30. des. 2026–2. jan. 2027');
    expect(dayRangeTitle(d('2026-11-16'), d('2026-11-16'))).toBe('Mandag 16. nov.');
  });

  it('formats durations', () => {
    expect(durationLabel(240)).toBe('4 t');
    expect(durationLabel(90)).toBe('1 t 30 min');
    expect(durationLabel(45)).toBe('45 min');
  });

  it('groups items by month, keeping their order', () => {
    const groups = groupByMonth([d('2026-11-14'), d('2026-11-22'), d('2026-12-24')], (date) => date);
    expect(groups.map((group) => [group.label, group.items.length])).toEqual([
      ['November 2026', 2],
      ['Desember 2026', 1],
    ]);
  });
});
