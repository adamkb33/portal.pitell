import { addDays, addHours, addMinutes, differenceInMinutes, format, isSameDay, startOfHour } from 'date-fns';
import { nb } from 'date-fns/locale';
import { dayRangeTitle, dayTitle, durationLabel } from '../../_utils/periods';

/**
 * What the Nytt fravær form holds: one continuous period, Starter (day + time) to Slutter (day + time), the way the
 * backend stores it. Days are `yyyy-MM-dd`, times `HH:mm`; Hele dagen ignores the times.
 */
export type AbsenceDraft = {
  wholeDay: boolean;
  startDay: string;
  startTime: string;
  endDay: string;
  endTime: string;
};

/** One period as the action takes it (local Oslo dates and times). */
export type AbsenceRange = { fromDate: string; toDate: string; startTime: string; endTime: string };

export type AbsenceSummary =
  | { valid: true; text: string; range: AbsenceRange }
  | { valid: false; text: string; range?: undefined };

const at = (day: string, time: string) => new Date(`${day}T${time}:00`);

/**
 * A new absence starts as the next whole hour, one hour long (not Hele dagen, which is a choice). After 22:00 it is
 * tomorrow 09:00–10:00 instead, so it never runs past midnight by default.
 */
export function defaultAbsenceDraft(now: Date): AbsenceDraft {
  let start = addHours(startOfHour(now), 1);
  if (start.getHours() >= 23 || !isSameDay(start, now)) {
    start = new Date(addDays(now, 1).setHours(9, 0, 0, 0));
  }
  const end = addHours(start, 1);
  return {
    wholeDay: false,
    startDay: format(start, 'yyyy-MM-dd'),
    startTime: format(start, 'HH:mm'),
    endDay: format(end, 'yyyy-MM-dd'),
    endTime: format(end, 'HH:mm'),
  };
}

/** A new start day moves the end day along when it would otherwise end before it, so one day stays one click. */
export function withStartDay(draft: AbsenceDraft, startDay: string): AbsenceDraft {
  return { ...draft, startDay, endDay: draft.endDay < startDay ? startDay : draft.endDay };
}

/**
 * The period the form will save and the one line the Lagre bar shows ("Torsdag 12. nov. · 12:00–13:00 · 1 t",
 * "Torsdag 12. nov. 12:00 → søndag 15. nov. 18:00"), or why it can't be saved. Hele dagen is 00:00–23:59, from a
 * minute from now when it starts today.
 */
export function absenceSummary(draft: AbsenceDraft, now: Date): AbsenceSummary {
  const oneDay = draft.startDay === draft.endDay;
  let startTime = draft.wholeDay ? '00:00' : draft.startTime;
  const endTime = draft.wholeDay ? '23:59' : draft.endTime;
  if (draft.wholeDay && isSameDay(at(draft.startDay, '00:00'), now)) startTime = format(addMinutes(now, 1), 'HH:mm');

  const start = at(draft.startDay, startTime);
  const end = at(draft.endDay, endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { valid: false, text: 'Velg tid' };
  if (draft.endDay < draft.startDay) return { valid: false, text: 'Slutter må være samme dag eller senere' };
  if (!draft.wholeDay && start <= now) return { valid: false, text: 'Starter må være senere enn nå' };
  if (end <= start) return { valid: false, text: 'Slutter må være etter starter' };

  const firstDay = at(draft.startDay, '00:00');
  const lastDay = at(draft.endDay, '00:00');
  const text = draft.wholeDay
    ? `${oneDay ? dayTitle(firstDay) : dayRangeTitle(firstDay, lastDay)} · hele dagen`
    : oneDay
      ? `${dayTitle(firstDay)} · ${startTime}–${endTime} · ${durationLabel(differenceInMinutes(end, start))}`
      : `${dayTitle(firstDay)} ${startTime} → ${format(lastDay, 'EEEE d. MMM', { locale: nb })} ${endTime}`;

  return {
    valid: true,
    text,
    range: { fromDate: draft.startDay, toDate: draft.endDay, startTime, endTime },
  };
}
