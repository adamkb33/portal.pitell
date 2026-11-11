import { ROUTE_TREE } from './routing/route-tree';
import type { RouteBranch } from './routing/route-types';

type RouteMetaEntry = {
  id: string;
  href: string;
  title: string;
};

const TITLE_SUFFIX = ' | Pitell';
const DEFAULT_TITLE = 'Forside';

const ROUTE_TITLE_OVERRIDES: Record<string, string> = {
  'auth.respond-invite': 'Svar på invitasjon',
  'auth.respond-user-invite': 'Svar på brukerinvitasjon',
  booking: 'Booking',
  'booking.public': 'Bestill time',
  'booking.public.appointment': 'Bestill time',
  'booking.public.appointment.session': 'Bestill time',
  'booking.public.appointment.session.contact': 'Kontaktinformasjon',
  'booking.public.appointment.session.contact.sign-in': 'Logg inn',
  'booking.public.appointment.session.contact.sign-up': 'Opprett konto',
  'booking.public.appointment.session.contact.verify-email': 'Bekreft e-post',
  'booking.public.appointment.session.contact.verify-mobile': 'Bekreft mobil',
  'booking.public.appointment.session.contact.collect-email': 'Legg til e-post',
  'booking.public.appointment.session.contact.collect-mobile': 'Legg til mobil',
  'booking.public.appointment.session.employee': 'Velg ansatt',
  'booking.public.appointment.session.overview': 'Bekreft timebestilling',
  'booking.public.appointment.success': 'Bestilling fullført',
  'booking.public.appointment.cancel': 'Avbestill time',
  'booking.public.appointment.cancel-by-id': 'Avbestill time',
  'booking.public.my-appointments.appointment': 'Din time',
  'booking.public.my-appointments.loyalty': 'Lojalitetskort',
  'company.request-role-delete': 'Slett selskapsrolle',
  'company.booking.admin': 'Bookingadministrasjon',
  'company.booking.admin.settings': 'Bookinginnstillinger',
  'company.booking.admin.service-groups': 'Tjenestegrupper',
  'company.booking.profile': 'Min bookingprofil',
  'company.booking.profile.create': 'Opprett bookingprofil',
  'company.booking.profile.edit': 'Rediger profil',
  'company.booking.schedule-unavailability': 'Fravær',
  'company.booking.appointments': 'Timebestillinger',
  'company.booking.appointments.create': 'Opprett timebestilling',
  'company.booking.schedule.availabilities': 'Tilgjengelighet',
  'company.offer.create': 'Opprett tilbud',
  'company.notifications.view': 'Varsel',
  'company.timesheet.admin': 'Timelisteadministrasjon',
  'company.timesheet.edit-range': 'Rediger tidsintervall',
  'company.timesheet.edit-hours': 'Rediger timer',
  'system-admin.users': 'Systemadmin: Brukere',
  'system-admin.companies': 'Systemadmin: Selskaper',
  'system-admin.companies.roles': 'Tildel selskapsroller',
  'system-admin.companies.products': 'Tildel produkter',
  'system-admin.companies.products.delete': 'Fjern produkter',
  'system-admin.diagnostics': 'Systemadmin: Diagnostikk',
  'system-admin.diagnostics.booking': 'Bookingdiagnostikk',
  'system-admin.diagnostics.booking.public-appointment-cancellation-by-token': 'Kansellering med token',
  'system-admin.smtp': 'Systemadmin: SMTP',
  'system-admin.smtp.diagnostics': 'SMTP-diagnostikk',
  'offer.public': 'Tilbud',
  'marketing.public': 'Avmelding',
  styleguide: 'Stilguide',
};

const STATIC_ROUTE_META: RouteMetaEntry[] = [
  { id: 'root', href: '/', title: DEFAULT_TITLE },
  { id: 'styleguide', href: '/styleguide', title: ROUTE_TITLE_OVERRIDES.styleguide },
];

const normalizePath = (path: string): string => {
  const pathname = path.split(/[?#]/)[0] || '/';
  const normalized = pathname.replace(/\/+/g, '/').replace(/\/$/, '');
  return normalized || '/';
};

const matchesRoutePath = (routeHref: string, pathname: string): boolean => {
  const routePath = normalizePath(routeHref);
  const currentPath = normalizePath(pathname);

  if (routePath === currentPath) {
    return true;
  }

  const routeSegments = routePath.split('/').filter(Boolean);
  const currentSegments = currentPath.split('/').filter(Boolean);

  if (routeSegments.length !== currentSegments.length) {
    return false;
  }

  return routeSegments.every((segment, index) => segment.startsWith(':') || segment === currentSegments[index]);
};

const getFallbackTitle = (branch: RouteBranch): string => {
  if (branch.label) {
    return branch.label;
  }

  const lastIdSegment = branch.id.split('.').at(-1) ?? DEFAULT_TITLE;
  return lastIdSegment
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

const collectRouteMeta = (branches: RouteBranch[]): RouteMetaEntry[] =>
  branches.flatMap((branch) => [
    {
      id: branch.id,
      href: branch.href,
      title: ROUTE_TITLE_OVERRIDES[branch.id] ?? getFallbackTitle(branch),
    },
    ...collectRouteMeta(branch.children ?? []),
  ]);

const ROUTE_META_ENTRIES = [...STATIC_ROUTE_META, ...collectRouteMeta(ROUTE_TREE)].sort(
  (first, second) => normalizePath(second.href).length - normalizePath(first.href).length,
);

const getDescription = (routeId: string): string => {
  if (routeId.startsWith('auth')) {
    return 'Logg inn, opprett konto eller bekreft tilgang i Pitell.';
  }

  if (routeId.startsWith('booking')) {
    return 'Bestill og administrer timebestillinger i Pitell.';
  }

  if (routeId.startsWith('company')) {
    return 'Administrer selskap, ansatte og produkter i Pitell.';
  }

  if (routeId.startsWith('system-admin')) {
    return 'Administrer systemfunksjoner i Pitell.';
  }

  if (routeId.startsWith('offer')) {
    return 'Se og svar på tilbud i Pitell.';
  }

  if (routeId.startsWith('user')) {
    return 'Administrer brukerprofil og selskapstilknytninger i Pitell.';
  }

  return 'Administrer arbeidshverdagen i Pitell.';
};

export const getRouteMetadata = (pathname: string) => {
  // An exact path wins over a pattern of the same depth: `/company/offers/create` is the create page, not `:offerId`.
  const matchedRoute =
    ROUTE_META_ENTRIES.find((entry) => normalizePath(entry.href) === normalizePath(pathname)) ??
    ROUTE_META_ENTRIES.find((entry) => matchesRoutePath(entry.href, pathname)) ??
    STATIC_ROUTE_META[0];
  const title = matchedRoute.title.endsWith(TITLE_SUFFIX) ? matchedRoute.title : `${matchedRoute.title}${TITLE_SUFFIX}`;

  return {
    title,
    description: getDescription(matchedRoute.id),
  };
};
