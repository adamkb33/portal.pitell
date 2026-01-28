import { endOfDay, startOfDay } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export const DEFAULT_QUERY_TIMEZONE = 'Europe/Oslo';

const OFFSET_DATE_TIME_PATTERN = "yyyy-MM-dd'T'HH:mm:ssXXX";
const DATE_INPUT_PATTERN = 'yyyy-MM-dd';

type QueryPrimitive = string | number | boolean;
type QueryValue = QueryPrimitive | null | undefined | Array<QueryPrimitive | null | undefined>;

export function serializeQueryParams(params: Record<string, QueryValue>) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value == null) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item != null) {
          search.append(key, String(item));
        }
      });
      return;
    }

    search.set(key, String(value));
  });

  return search.toString();
}

export function formatOffsetDateTimeInTimeZone(date: Date, timezone = DEFAULT_QUERY_TIMEZONE) {
  return formatInTimeZone(date, timezone, OFFSET_DATE_TIME_PATTERN);
}

export function formatDateInputInTimeZone(date: Date, timezone = DEFAULT_QUERY_TIMEZONE) {
  return formatInTimeZone(date, timezone, DATE_INPUT_PATTERN);
}

export function formatDateBoundaryInTimeZone(
  dateInput: string,
  boundary: 'start' | 'end',
  timezone = DEFAULT_QUERY_TIMEZONE,
) {
  if (!dateInput) {
    return '';
  }

  const time = boundary === 'start' ? '00:00:00' : '23:59:59';
  const utcDate = fromZonedTime(`${dateInput}T${time}`, timezone);
  return formatOffsetDateTimeInTimeZone(utcDate, timezone);
}

export function formatLocalDateTimeInTimeZone(dateInput: string, timeInput: string, timezone = DEFAULT_QUERY_TIMEZONE) {
  const normalizedTime = timeInput.split(':').length === 2 ? `${timeInput}:00` : timeInput;
  const utcDate = fromZonedTime(`${dateInput}T${normalizedTime}`, timezone);
  return formatOffsetDateTimeInTimeZone(utcDate, timezone);
}

export function formatStartOfDayInTimeZone(date: Date, timezone = DEFAULT_QUERY_TIMEZONE) {
  const dateInput = formatDateInputInTimeZone(date, timezone);
  return formatDateBoundaryInTimeZone(dateInput, 'start', timezone);
}

export function formatEndOfDayInTimeZone(date: Date, timezone = DEFAULT_QUERY_TIMEZONE) {
  const dateInput = formatDateInputInTimeZone(date, timezone);
  return formatDateBoundaryInTimeZone(dateInput, 'end', timezone);
}

export function formatCurrentDateTimeInTimeZone(timezone = DEFAULT_QUERY_TIMEZONE) {
  return formatOffsetDateTimeInTimeZone(new Date(), timezone);
}

export function toDateInputFromOffsetDateTime(value?: string | null, timezone = DEFAULT_QUERY_TIMEZONE) {
  if (!value) {
    return '';
  }

  try {
    return formatInTimeZone(new Date(value), timezone, DATE_INPUT_PATTERN);
  } catch {
    return '';
  }
}

export function normalizeToTimeZoneDayRange(date: Date, timezone = DEFAULT_QUERY_TIMEZONE) {
  const normalizedDate = new Date(date);
  return {
    start: formatStartOfDayInTimeZone(startOfDay(normalizedDate), timezone),
    end: formatEndOfDayInTimeZone(endOfDay(normalizedDate), timezone),
  };
}
