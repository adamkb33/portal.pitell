import { describe, expect, it } from 'vitest';
import { filterTimeSlots, groupTimeSlots } from './time-slots';

const slot = (time: string) => ({
  startTime: `2026-11-02T${time}:00+01:00`,
  endTime: `2026-11-02T${time}:00+01:00`,
});

describe('date time selector slots', () => {
  const slots = ['10:00', '10:05', '10:10', '10:15', '12:00', '12:05', '17:30'].map(slot);

  it('shows only quarter-hour slots', () => {
    expect(filterTimeSlots(slots, null).map((item) => item.startTime.slice(11, 16))).toEqual([
      '10:00',
      '10:15',
      '12:00',
      '17:30',
    ]);
  });

  it('keeps the selected slot visible even when it is not on a quarter hour', () => {
    const selected = new Date('2026-11-02T10:05:00+01:00');
    expect(filterTimeSlots(slots, selected).map((item) => item.startTime.slice(11, 16))).toContain('10:05');
  });

  it('falls back to every slot when none start on a quarter hour', () => {
    const offGrid = ['10:05', '10:10'].map(slot);
    expect(filterTimeSlots(offGrid, null)).toEqual(offGrid);
  });

  it('groups slots into morning, afternoon and evening in Oslo time', () => {
    const groups = groupTimeSlots(filterTimeSlots(slots, null));
    expect(groups.map((group) => [group.label, group.slots.length])).toEqual([
      ['Formiddag', 2],
      ['Ettermiddag', 1],
      ['Kveld', 1],
    ]);
  });
});
