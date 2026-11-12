/**
 * Times are shown in the shop's time (Europe/Oslo), never the viewer's browser zone or the render server's zone.
 * A customer abroad and the barber see the same 10:00.
 */
export const OSLO_TZ = 'Europe/Oslo';

type DateInput = string | number | Date;

const DAY_MS = 86_400_000;

const toDate = (value: DateInput) => (value instanceof Date ? value : new Date(value));

export function formatOslo(value: DateInput, options: Intl.DateTimeFormatOptions, locale = 'nb-NO'): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: OSLO_TZ }).format(toDate(value));
}

/** HH:mm in Oslo. */
export function formatOsloTime(value: DateInput): string {
  return formatOslo(value, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
}

/** Calendar day in Oslo as YYYY-MM-DD. */
export function osloDateKey(value: DateInput): string {
  return formatOslo(value, { year: 'numeric', month: '2-digit', day: '2-digit' }, 'sv-SE');
}

/** Calendar parts of the Oslo day. `weekday` is 0 = Sunday, like Date.getDay(). */
export function osloDateParts(value: DateInput) {
  const [year, month, day] = osloDateKey(value).split('-').map(Number);
  return { year, monthIndex: month - 1, day, weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay() };
}

/** Whole calendar days from today to `value` in Oslo: 0 = today, 1 = tomorrow. Safe on summer time days. */
export function osloDaysFromToday(value: DateInput, now: DateInput = new Date()): number {
  const dayNumber = (input: DateInput) => Date.parse(`${osloDateKey(input)}T00:00:00Z`) / DAY_MS;
  return dayNumber(value) - dayNumber(now);
}
