import { addDays, format } from 'date-fns';
import type { ScheduleDto } from '~/api/generated';
import { formatTime } from '~/lib/date.utils';

export function isSameSlotTime(a: string, b: string): boolean {
  const aTime = parseDateTime(a);
  const bTime = parseDateTime(b);
  if (aTime !== null && bTime !== null) {
    return aTime === bTime;
  }
  return a === b;
}

export function findScheduleWithTime(schedules: ScheduleDto[], startTime: string): string | null {
  for (const schedule of schedules) {
    if (schedule.timeSlots.some((slot) => isSameSlotTime(slot.startTime, startTime))) {
      return schedule.date;
    }
  }
  return null;
}

export function getEarliestSlot(schedules: ScheduleDto[]): { date: string; time: string } | null {
  if (schedules.length === 0) return null;

  const firstSchedule = schedules[0];
  const firstSlot = firstSchedule.timeSlots[0];

  return firstSlot ? { date: firstSchedule.date, time: firstSlot.startTime } : null;
}

export function groupTimeSlotsByHour(timeSlots: ScheduleDto['timeSlots']) {
  return timeSlots.reduce<Record<string, ScheduleDto['timeSlots']>>((groups, slot) => {
    const hourLabel = formatTime(slot.startTime).split(':')[0] + ':00';
    if (!groups[hourLabel]) {
      groups[hourLabel] = [];
    }
    groups[hourLabel].push(slot);
    return groups;
  }, {});
}

function parseDateTime(value: string): number | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

export type BookingDay = {
  key: string;
  date: Date;
  /** Has at least one free time; other days stay in the row, faded, as "fullbooket". */
  isAvailable: boolean;
};

/** Every calendar day from the first to the last schedule date, so the row has no gaps. */
export function buildBookingDays(schedules: ScheduleDto[]): BookingDay[] {
  if (schedules.length === 0) return [];
  const slotsByDate = new Map(schedules.map((schedule) => [schedule.date, schedule.timeSlots.length]));
  const dateKeys = schedules.map((schedule) => schedule.date).sort();
  const lastKey = dateKeys[dateKeys.length - 1];
  const days: BookingDay[] = [];
  for (let date = new Date(`${dateKeys[0]}T00:00:00`); ; date = addDays(date, 1)) {
    const key = format(date, 'yyyy-MM-dd');
    days.push({ key, date, isAvailable: (slotsByDate.get(key) ?? 0) > 0 });
    if (key >= lastKey) break;
  }
  return days;
}

export function findNextAvailableDay(days: BookingDay[], afterKey: string): BookingDay | null {
  return days.find((day) => day.key > afterKey && day.isAvailable) ?? null;
}
