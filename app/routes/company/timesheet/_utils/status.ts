import type { TimesheetDayEntryDto } from '~/api/generated/timesheet';

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive';
export type TimesheetStatus = TimesheetDayEntryDto['status'];
type TimesheetMode = TimesheetDayEntryDto['entryMode'];

export const TIMESHEET_STATUS_LABELS: Record<TimesheetStatus, string> = {
  SUBMITTED: 'Innlevert',
  ACCEPTED: 'Godkjent',
  DECLINED: 'Avvist',
};

export const TIMESHEET_STATUS_VARIANTS: Record<TimesheetStatus, BadgeVariant> = {
  SUBMITTED: 'secondary',
  ACCEPTED: 'default',
  DECLINED: 'destructive',
};

export const TIMESHEET_SUBMITTED_STATUS_LABELS: Record<TimesheetDayEntryDto['status'], string> = {
  SUBMITTED: 'Innlevert',
  ACCEPTED: 'Godkjent',
  DECLINED: 'Avvist',
};

export const TIMESHEET_SUBMITTED_STATUS_VARIANTS: Record<TimesheetDayEntryDto['status'], BadgeVariant> = {
  SUBMITTED: 'default',
  ACCEPTED: 'secondary',
  DECLINED: 'destructive',
};

export const TIMESHEET_MODE_LABELS: Record<TimesheetMode, string> = {
  RANGE: 'Tidsintervall',
  HOURS: 'Timer',
};
