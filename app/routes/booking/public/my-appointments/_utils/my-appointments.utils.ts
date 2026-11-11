import type { CompanySummaryDto, GroupedServiceGroupDto, LoyaltyCardDto } from '~/api/generated';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { getBookingRouteHref } from '~/routes/booking/public/_utils/booking.route-map';
import {
  bookingActionBaseClass,
  bookingActionSizeClass,
  bookingActionVariantClass,
} from '~/routes/booking/public/_components/booking-action-styles';

type AppointmentTimes = {
  id: number;
  startTime: string;
  endTime: string;
  groupedServiceGroups: GroupedServiceGroupDto[];
};

export const formatDateParts = (iso: string) => {
  const date = new Date(iso);
  const longDate = new Intl.DateTimeFormat('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
  return {
    // Norwegian writes months in lower case, so only the weekday gets a capital.
    longDate: longDate.charAt(0).toUpperCase() + longDate.slice(1),
    day: String(date.getDate()),
    month: new Intl.DateTimeFormat('nb-NO', { month: 'short' }).format(date).replace('.', ''),
    shortDate: new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short' }).format(date),
    time: new Intl.DateTimeFormat('nb-NO', { hour: '2-digit', minute: '2-digit' }).format(date),
  };
};

// Same look as BookingLink/BookingActionButton, for plain <a> tags (calendar download, maps).
export const bookingAnchorClass = (variant: 'primary' | 'secondary' | 'tonal' | 'outline' | 'inline' = 'outline') =>
  [bookingActionBaseClass, bookingActionVariantClass[variant], variant !== 'inline' && bookingActionSizeClass.md]
    .filter(Boolean)
    .join(' ');

export const getCompanyName = (company: Pick<CompanySummaryDto, 'id' | 'name'>) =>
  company.name?.trim() || `Bedrift #${company.id}`;

/** "Storgata 1, 1607 Fredrikstad": the business address, else the postal one. */
export const formatCompanyAddress = (company?: Pick<CompanySummaryDto, 'businessAddress' | 'postalAddress'> | null) => {
  const address = company?.businessAddress ?? company?.postalAddress;
  return [...(address?.addressLines ?? []), [address?.postalCode, address?.city].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
};

export const flattenServiceNames = (appointment: Pick<AppointmentTimes, 'groupedServiceGroups'>) =>
  appointment.groupedServiceGroups.flatMap((group) => group.services.map((service) => service.name).filter(Boolean));

export const buildCalendarPayload = (appointment: AppointmentTimes, companyName?: string) => {
  const formatIcsDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const name = companyName?.trim() || 'bedrift';
  const summary = `Avtale hos ${name}`;
  const serviceNames = flattenServiceNames(appointment);
  const description = serviceNames.length ? `Tjenester: ${serviceNames.join(', ')}` : '';

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pitell//Booking//NO',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${appointment.id}-${appointment.startTime}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(new Date(appointment.startTime))}`,
    `DTEND:${formatIcsDate(new Date(appointment.endTime))}`,
    `SUMMARY:${summary}`,
    description ? `DESCRIPTION:${description}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');

  return {
    href: `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`,
    filename: `${name}-appointment.ics`.replace(/\s+/g, '-').toLowerCase(),
  };
};

export const buildGoogleMapsUrl = (company?: CompanySummaryDto | null) => {
  const address = company?.businessAddress ?? company?.postalAddress;
  if (!address) return null;

  const query = [...(address.addressLines ?? []), address.postalCode, address.city, address.country]
    .filter(Boolean)
    .join(' ');

  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

export const buildCancelHref = (appointmentId: number) =>
  ROUTES_MAP['booking.public.appointment.cancel-by-id'].href.replace(':appointmentId', String(appointmentId));

export const buildNewBookingHref = (companyId?: number | null): string | null => {
  if (!companyId) return null;
  return `${getBookingRouteHref('session')}?${new URLSearchParams({ companyId: String(companyId) }).toString()}`;
};

export const buildAppointmentHref = (appointmentId: number) =>
  ROUTES_MAP['booking.public.my-appointments.appointment'].href.replace(':appointmentId', String(appointmentId));

export const buildLoyaltyHref = (companyId: number) =>
  ROUTES_MAP['booking.public.my-appointments.loyalty'].href.replace(':companyId', String(companyId));

// Visits 1 to N-1 are paid, visit N is free, then the card starts over.
// `visitsInCycle` is how many visits are done on the current card.
export const getLoyaltyProgress = (card: LoyaltyCardDto) => ({
  filled: card.visitsInCycle,
  paidVisitsLeft: card.visitsRequired - 1 - card.visitsInCycle,
});

// One sentence used on every customer screen so the wording never differs.
// Progress counts "besøk", never "timer": "4 timer til" reads as "4 more hours". A single booked appointment is
// still a "time" ("Denne timen er gratis"), and the count stays in digits so it matches the numbered stamps.
export const describeLoyaltyProgress = (card: LoyaltyCardDto): string => {
  if (card.visitsRequired === 1) return 'Alle besøk er gratis';
  if (card.nextVisitIsFree) return 'Neste besøk er gratis';
  const { paidVisitsLeft } = getLoyaltyProgress(card);
  return `${paidVisitsLeft} besøk til gratis time`;
};
