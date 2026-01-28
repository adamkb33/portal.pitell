import type { TimesheetDayEntryDto } from '~/api/generated/timesheet';

export type WeekSummary = {
  weekNumber: number;
  startDate: string;
  endDate: string;
  entries: TimesheetDayEntryDto[];
};

export type DayFormState = {
  date: string;
  entryMode: 'RANGE' | 'HOURS';
  fromTime: string;
  toTime: string;
  hours: string;
  breakMinutes: string;
  note: string;
  activePicker: 'from' | 'to' | null;
};
