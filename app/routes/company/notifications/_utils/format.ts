import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';

export function formatNotificationTimestamp(value?: string) {
  if (!value) {
    return 'Ikke tilgjengelig';
  }

  try {
    return format(parseISO(value), 'PPP p', { locale: nb });
  } catch {
    return value;
  }
}

export function compactText(value?: string | null, fallback = 'Ingen verdi') {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}
