import { BarChart3, CalendarDays, CircleUserRound, Clock4, Gift, List, type LucideIcon } from 'lucide-react';

/**
 * The booking domain's areas (ui-rules → references/booking-domain.md). One list, so the overview, the area switches
 * and anything else that shows an area agree on its name, color and pages. Keep it in sync with the blueprint map.
 */
export type BookingArea = {
  key: 'workday' | 'availability' | 'profile' | 'statistics' | 'services' | 'loyalty';
  label: string;
  /** One muted line under the name on the overview. */
  line: string;
  icon: LucideIcon;
  /** Position in the category palette (`categoryTone`): the area's fixed color. */
  tone: number;
  /** Route ids of the area's pages; the area opens on the first one the user may see. */
  pages: string[];
  adminOnly: boolean;
};

export const BOOKING_AREAS: readonly BookingArea[] = [
  {
    key: 'workday',
    label: 'Kalender og timer',
    line: 'Arbeidsdagen',
    icon: CalendarDays,
    tone: 0, // teal
    pages: ['company.booking.schedule', 'company.booking.appointments'],
    adminOnly: false,
  },
  {
    key: 'availability',
    label: 'Tilgjengelighet',
    line: 'Bookbar tid og fravær',
    icon: Clock4,
    tone: 1, // purple
    pages: ['company.booking.schedule.availabilities', 'company.booking.schedule-unavailability'],
    adminOnly: false,
  },
  {
    key: 'profile',
    label: 'Bookingprofil',
    line: 'Det kundene ser',
    icon: CircleUserRound,
    tone: 2, // pink
    pages: ['company.booking.profile'],
    adminOnly: false,
  },
  {
    key: 'statistics',
    label: 'Statistikk',
    line: 'Omsetning og avtaler',
    icon: BarChart3,
    tone: 5, // plum
    pages: ['company.booking.statistics'],
    adminOnly: false,
  },
  {
    key: 'services',
    label: 'Tjenester',
    line: 'Tjenester og grupper',
    icon: List,
    tone: 3, // orange
    pages: ['company.booking.admin.services', 'company.booking.admin.service-groups'],
    adminOnly: true,
  },
  {
    key: 'loyalty',
    label: 'Lojalitetsprogram',
    line: 'Gratis besøk for faste kunder',
    icon: Gift,
    tone: 4, // sky
    pages: ['company.booking.admin.loyalty'],
    adminOnly: true,
  },
];
