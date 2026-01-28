import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';

const buildDateFromInput = (value: string) => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDateInputToZonedISOString = (value: string): string => {
  const date = buildDateFromInput(value);
  if (!date) {
    return value;
  }

  return date.toISOString();
};

export const toDateInputValue = (value?: string) => {
  if (!value) return '';

  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

export const formatDisplayDate = (value: string | undefined) => {
  if (!value) {
    return 'Ukjent dato';
  }

  try {
    return format(parseISO(value), 'd. MMMM yyyy', { locale: nb });
  } catch {
    return value;
  }
};

export const formatDuration = (minutes: number | undefined) => {
  if (!minutes || minutes <= 0) {
    return '0m';
  }

  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hrs && mins) {
    return `${hrs}t ${mins}m`;
  }

  if (hrs) {
    return `${hrs}t`;
  }

  return `${mins}m`;
};

export const parseIsoDate = (value?: string | null) => {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

export const toIsoDate = (value?: Date) => {
  if (!value) return '';
  return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())).toISOString().slice(0, 10);
};
