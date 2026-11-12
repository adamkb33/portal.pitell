import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { DEFAULT_QUERY_TIMEZONE } from '~/lib/query';
import type { ScheduleUnavailabilityGroupDto } from '~/api/generated';
import { dayRangeTitle } from '../../_utils/periods';

type Slot = ScheduleUnavailabilityGroupDto['blockedSlots'][number];

const time = (value: string) => formatInTimeZone(value, DEFAULT_QUERY_TIMEZONE, 'HH:mm');

/** A blocked slot that covers the whole day (00:00 → 23:59 or midnight). */
export function isWholeDay(slot: Slot): boolean {
  return time(slot.startTime) === '00:00' && ['00:00', '23:59'].includes(time(slot.endTime));
}

/** The last day an absence covers; an end at midnight belongs to the day before. */
function lastDay(group: ScheduleUnavailabilityGroupDto): Date {
  const end = new Date(group.to);
  return time(group.to) === '00:00' ? new Date(end.getTime() - 60_000) : end;
}

/** "Mandag 16. nov." or "24.–26. des." */
export function absenceTitle(group: ScheduleUnavailabilityGroupDto): string {
  return dayRangeTitle(
    toZonedTime(group.from, DEFAULT_QUERY_TIMEZONE),
    toZonedTime(lastDay(group), DEFAULT_QUERY_TIMEZONE),
  );
}

/** "Hele dagen", "12:00–13:00", "12:00–13:00 hver dag" or "Ulike tider". */
export function absenceLine(group: ScheduleUnavailabilityGroupDto): string {
  const slots = group.blockedSlots;
  if (slots.length === 0 || slots.every(isWholeDay)) return 'Hele dagen';

  const ranges = new Set(slots.map((slot) => `${time(slot.startTime)}–${time(slot.endTime)}`));
  if (ranges.size > 1) return 'Ulike tider';
  const [range] = ranges;
  return slots.length > 1 ? `${range} hver dag` : range;
}

export function isPastAbsence(group: ScheduleUnavailabilityGroupDto, now = Date.now()): boolean {
  return new Date(group.to).getTime() < now;
}
