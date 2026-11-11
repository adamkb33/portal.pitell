import { addMonths, format, isSameDay, isSameMonth, isSameYear, startOfDay } from 'date-fns';
import { nb } from 'date-fns/locale';

/** Kommende | Tidligere, the one time filter for lists of planned time (ui-rules: one way to filter by time). */
export type Period = 'kommende' | 'tidligere';

export const PERIOD_PARAM = 'periode';

export function readPeriod(url: URL): Period {
  return url.searchParams.get(PERIOD_PARAM) === 'tidligere' ? 'tidligere' : 'kommende';
}

/** Kommende: today and the next 12 months. Tidligere: the last 6 months up to today. */
export function periodWindow(period: Period, now = new Date()): { start: Date; end: Date } {
  const today = startOfDay(now);
  return period === 'tidligere'
    ? { start: addMonths(today, -6), end: today }
    : { start: today, end: addMonths(today, 12) };
}

const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase('nb-NO') + text.slice(1);

/** "November 2026" */
export function monthLabel(date: Date): string {
  return capitalize(format(date, 'LLLL yyyy', { locale: nb }));
}

/** "Lørdag 14. nov." */
export function dayTitle(date: Date): string {
  return capitalize(format(date, 'EEEE d. MMM', { locale: nb }));
}

/** One day: "Lørdag 14. nov."; several: "24.–26. des.", "30. nov.–2. des.", "30. des. 2026–2. jan. 2027". */
export function dayRangeTitle(from: Date, to: Date): string {
  if (isSameDay(from, to)) return dayTitle(from);
  if (isSameMonth(from, to)) return `${format(from, 'd.')}–${format(to, 'd. MMM', { locale: nb })}`;
  if (isSameYear(from, to)) return `${format(from, 'd. MMM', { locale: nb })}–${format(to, 'd. MMM', { locale: nb })}`;
  return `${format(from, 'd. MMM yyyy', { locale: nb })}–${format(to, 'd. MMM yyyy', { locale: nb })}`;
}

/** "4 t", "1 t 30 min", "45 min" */
export function durationLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} t` : `${hours} t ${rest} min`;
}

/** Items under a strip per month, in the order given. */
export function groupByMonth<T>(items: T[], dateOf: (item: T) => Date): { key: string; label: string; items: T[] }[] {
  const groups = new Map<string, { key: string; label: string; items: T[] }>();
  for (const item of items) {
    const date = dateOf(item);
    const key = format(date, 'yyyy-MM');
    if (!groups.has(key)) groups.set(key, { key, label: monthLabel(date), items: [] });
    groups.get(key)!.items.push(item);
  }
  return [...groups.values()];
}
