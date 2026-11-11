import type { ScheduleTimeSlot } from '~/api/generated';

export type TimeSlotGroup = {
  label: string;
  slots: ScheduleTimeSlot[];
};

const hourFormatter = new Intl.DateTimeFormat('nb-NO', { hour: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Oslo' });

function getOsloHour(dateTime: string): number {
  return Number(hourFormatter.format(new Date(dateTime)));
}

function isQuarterHour(dateTime: string): boolean {
  return new Date(dateTime).getUTCMinutes() % 15 === 0;
}

/** Quarter-hour slots only; the selected slot always stays visible. */
export function filterTimeSlots(slots: ScheduleTimeSlot[], selected: Date | null) {
  const filtered = slots.filter(
    (slot) => isQuarterHour(slot.startTime) || new Date(slot.startTime).getTime() === selected?.getTime(),
  );
  return filtered.length > 0 ? filtered : slots;
}

export function groupTimeSlots(slots: ScheduleTimeSlot[]): TimeSlotGroup[] {
  const groups: TimeSlotGroup[] = [
    { label: 'Formiddag', slots: [] },
    { label: 'Ettermiddag', slots: [] },
    { label: 'Kveld', slots: [] },
  ];
  for (const slot of slots) {
    const hour = getOsloHour(slot.startTime);
    groups[hour < 12 ? 0 : hour < 17 ? 1 : 2].slots.push(slot);
  }
  return groups.filter((group) => group.slots.length > 0);
}
