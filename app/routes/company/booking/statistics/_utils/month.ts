/**
 * The month on the Statistikk pages lives in the URL (`?maned=2026-10`), like every filter, so a month can be linked
 * and survives a reload. No `maned` means the current month.
 */
export const MONTH_PARAM = 'maned';

const MONTH_NAMES = [
  'januar',
  'februar',
  'mars',
  'april',
  'mai',
  'juni',
  'juli',
  'august',
  'september',
  'oktober',
  'november',
  'desember',
];

const WEEKDAY_NAMES = ['mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag', 'søndag'];

/** "2026-10" from the URL, or null when it's missing or not a month. */
export function readMonth(url: URL): string | null {
  const value = url.searchParams.get(MONTH_PARAM);
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : null;
}

/** "2026-10" → "2026-09" (offset -1) or "2026-11" (offset 1). */
export function shiftMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const index = year * 12 + (monthNumber - 1) + offset;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

/** "2026-10" → "oktober". */
export function monthName(month: string): string {
  return MONTH_NAMES[Number(month.split('-')[1]) - 1];
}

/** "2026-10" → "Oktober 2026". */
export function monthTitle(month: string): string {
  const name = monthName(month);
  return `${name[0].toUpperCase()}${name.slice(1)} ${month.split('-')[0]}`;
}

/** The link to `pathname` for `month`; the current month has no parameter. */
export function monthHref(pathname: string, month: string, currentMonth: string): string {
  return month === currentMonth ? pathname : `${pathname}?${MONTH_PARAM}=${month}`;
}

/** ISO weekday (1 = Monday) and hour → "mandag kl. 10". */
export function busyTimeLabel(dayOfWeek: number, hour: number): string {
  return `${WEEKDAY_NAMES[dayOfWeek - 1]} kl. ${String(hour).padStart(2, '0')}`;
}

export function capitalize(text: string): string {
  return text ? `${text[0].toUpperCase()}${text.slice(1)}` : text;
}

/** 17900 → "17 900 kr", with no-break spaces so an amount never wraps. */
export function formatKr(value: number): string {
  const digits = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(Math.round(value));
  return `${digits.replace(/\s/g, ' ')} kr`;
}

/**
 * One muted comparison with the month before: "33 % lavere enn oktober", "76 % flere enn oktober".
 * Null when there is nothing to compare with.
 */
export function compareWithPrevious(
  value: number,
  previous: number,
  previousMonth: string,
  words: { more: string; less: string },
): string | null {
  if (previous <= 0) return null;
  const percent = Math.round(((value - previous) / previous) * 100);
  if (percent === 0) return `Som i ${monthName(previousMonth)}`;
  return `${Math.abs(percent)} % ${percent > 0 ? words.more : words.less} enn ${monthName(previousMonth)}`;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}
