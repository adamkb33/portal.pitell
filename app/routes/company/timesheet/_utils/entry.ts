import type { TimesheetDayEntryDto } from '~/api/generated';
import { toDateInputValue } from './date';

export const parseTimesheetId = (idParam: string | undefined) => {
  const id = Number(idParam);
  return !idParam || Number.isNaN(id) ? null : id;
};

export const toRangeEditEntryState = (entry: TimesheetDayEntryDto) => ({
  date: toDateInputValue(entry.date),
  fromTime: entry.fromTime ?? '',
  toTime: entry.toTime ?? '',
  breakMinutes: 0,
  note: entry.note ?? '',
});

export const toHoursEditEntryState = (entry: TimesheetDayEntryDto) => ({
  date: toDateInputValue(entry.date),
  hours: entry.durationMinutes > 0 ? (entry.durationMinutes / 60).toString() : '',
  note: entry.note ?? '',
});
