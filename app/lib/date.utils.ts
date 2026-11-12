import { formatOsloTime, osloDateParts, osloDaysFromToday } from '~/lib/oslo-time';

const DAYS_NO = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];
const MONTHS_NO = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];

export function formatCompactDate(dateString: string) {
  const parts = osloDateParts(dateString);
  const dayName = DAYS_NO[parts.weekday];
  const day = parts.day;
  const month = MONTHS_NO[parts.monthIndex];
  const daysDiff = osloDaysFromToday(dateString);

  if (daysDiff === 0) return { day: 'I dag', date: String(day), month };
  if (daysDiff === 1) return { day: 'I morgen', date: String(day), month };
  return { day: dayName, date: String(day), month };
}

export function formatFullDate(dateString: string): string {
  const { day, date, month } = formatCompactDate(dateString);
  return `${day} ${date}. ${month}`;
}

export function formatTime(dateTimeString: string): string {
  return formatOsloTime(dateTimeString);
}
