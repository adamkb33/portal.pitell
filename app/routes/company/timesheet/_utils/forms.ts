type BulkEntryInput = {
  date: string;
  entryMode?: 'RANGE' | 'HOURS';
  fromTime?: string;
  toTime?: string;
  hours?: number | string;
  breakMinutes?: number | string;
  note?: string;
};

export const parseBulkEntries = (
  entriesRaw: FormDataEntryValue | null,
): { error?: string; entries: BulkEntryInput[] } => {
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
