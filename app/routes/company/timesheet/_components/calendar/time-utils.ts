import type { TimesheetDayEntryDto } from '~/api/generated/timesheet';
import { CALENDAR_END_HOUR, CALENDAR_START_HOUR } from './constants';

const parseTimeToMinutes = (value?: string) => {
  if (!value) return null;
  const [hoursRaw, minutesRaw] = value.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
};

export const formatHour = (hour: number) => `${hour.toString().padStart(2, '0')}:00`;

export const resolveEntryWindow = (entry: TimesheetDayEntryDto) => {
  if (entry.entryMode === 'RANGE') {
    const startMinutes = parseTimeToMinutes(entry.fromTime);
    const endMinutes = parseTimeToMinutes(entry.toTime);

    if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) {
      return null;
    }

    return {
      startMinutes,
      endMinutes,
    };
  }

  const durationMinutes = Number(entry.durationMinutes || 0);
  if (durationMinutes <= 0) return null;

  // Simple default anchor for HOURS entries in calendar mode.
  const startMinutes = 8 * 60;
  return {
    startMinutes,
    endMinutes: startMinutes + durationMinutes,
  };
};

export const clampEntryWindow = (window: { startMinutes: number; endMinutes: number }) => {
  const minMinutes = CALENDAR_START_HOUR * 60;
  const maxMinutes = CALENDAR_END_HOUR * 60;

  const startMinutes = Math.max(window.startMinutes, minMinutes);
  const endMinutes = Math.min(window.endMinutes, maxMinutes);

  if (endMinutes <= startMinutes) return null;

  return { startMinutes, endMinutes };
};

export const formatEntryLabel = (entry: TimesheetDayEntryDto) => {
  if (entry.entryMode === 'RANGE') {
    const from = entry.fromTime ?? '--:--';
    const to = entry.toTime ?? '--:--';
    return `${from} - ${to}`;
  }

  const minutes = entry.durationMinutes || 0;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours && rest) return `${hours}t ${rest}m`;
  if (hours) return `${hours}t`;
  return `${rest}m`;
};
