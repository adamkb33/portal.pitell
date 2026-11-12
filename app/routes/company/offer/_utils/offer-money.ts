import { OSLO_TZ } from '~/lib/oslo-time';
export function formatOfferCurrency(value: number): string {
  return new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK' }).format(value);
}

export function formatOfferDate(value?: string): string {
  if (!value) return 'Ingen frist';
  return new Intl.DateTimeFormat('nb-NO', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`));
}

export function formatOfferDateTime(value?: string): string {
  if (!value) return '';
  return new Intl.DateTimeFormat('nb-NO', { dateStyle: 'medium', timeStyle: 'short', timeZone: OSLO_TZ }).format(
    new Date(value),
  );
}
