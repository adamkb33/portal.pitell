import { format } from 'date-fns';
import type { DayFormState } from '../_types/timesheet.types';

type BulkEntryInput = {
  date: string;
  entryMode?: 'RANGE' | 'HOURS';
  fromTime?: string;
  toTime?: string;
  hours?: number | string;
  breakMinutes?: number | string;
  note?: string;
};

export const createDefaultDayFormState = (date: string, entryMode: DayFormState['entryMode']): DayFormState => ({
  date,
  entryMode,
  fromTime: '',
  toTime: '',
  hours: '',
  breakMinutes: '0',
  note: '',
  activePicker: null,
});

export const buildInitialWeekForms = (
  weekStart: string | undefined,
  defaultEntryMode: DayFormState['entryMode'],
): Record<string, DayFormState> => {
  if (!weekStart) return {};

  const start = new Date(weekStart);
  const forms: Record<string, DayFormState> = {};

  for (let i = 0; i < 7; i++) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const key = format(current, 'yyyy-MM-dd');
    forms[key] = createDefaultDayFormState(key, defaultEntryMode);
  }

  return forms;
};

export const patchDayFormState = (
  prev: Record<string, DayFormState>,
  dateKey: string,
  patch: Partial<DayFormState>,
  defaultEntryMode: DayFormState['entryMode'],
): Record<string, DayFormState> => {
  const existing = prev[dateKey] ?? createDefaultDayFormState(dateKey, defaultEntryMode);

  return {
    ...prev,
    [dateKey]: {
      ...existing,
      ...patch,
    },
  };
};

export const buildPendingEntries = (weekForms: Record<string, DayFormState>) =>
  Object.values(weekForms)
    .filter((entry) => {
      if (entry.entryMode === 'HOURS') {
        const hours = Number(entry.hours);
        return Number.isFinite(hours) && hours > 0;
      }

      return Boolean(entry.fromTime && entry.toTime);
    })
    .map((entry) =>
      entry.entryMode === 'HOURS'
        ? {
            date: entry.date,
            entryMode: 'HOURS',
            hours: Number(entry.hours),
            note: entry.note?.trim() || '',
          }
        : {
            date: entry.date,
            entryMode: 'RANGE',
            fromTime: entry.fromTime,
            toTime: entry.toTime,
            breakMinutes: Number(entry.breakMinutes) || 0,
            note: entry.note?.trim() || '',
          },
    );

export const parseBulkEntries = (entriesRaw: FormDataEntryValue | null): { error?: string; entries: BulkEntryInput[] } => {
  if (!entriesRaw) {
    return { error: 'Ingen endringer å lagre.', entries: [] };
  }

  try {
    const parsed = JSON.parse(entriesRaw.toString()) as BulkEntryInput[];
    return { entries: parsed ?? [] };
  } catch {
    return { error: 'Ugyldig dataformat. Oppfrisk siden og prøv igjen.', entries: [] };
  }
};

export const splitBulkEntries = (entries: BulkEntryInput[]) => {
  const normalizedEntries = (entries ?? []).filter((entry) => entry?.date);

  const rangeEntries = normalizedEntries.filter(
    (entry) => (entry.entryMode ?? 'RANGE') === 'RANGE' && entry.fromTime && entry.toTime,
  );

  const hoursEntries = normalizedEntries.filter((entry) => {
    if ((entry.entryMode ?? 'RANGE') !== 'HOURS') return false;
    const hours = Number(entry.hours);
    return Number.isFinite(hours) && hours > 0;
  });

  return { rangeEntries, hoursEntries };
};
