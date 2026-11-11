import { authService } from '~/lib/auth-service';
import type { Route } from './+types/company.booking.route';
import { AuthController, Booking } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { CalendarDays, ChevronRight, ListChecks } from 'lucide-react';
import { Link, useRouteLoaderData } from 'react-router';
import type { loader as rootLoader } from '~/routes/root.layout';
import type { loader as bookingLayoutLoader } from './company.booking.layout';
import { ROUTES_MAP, RoutePlaceMent } from '~/lib/routing/route-tree';
import { hasBranch } from '~/lib/routing/has-branch';
import { CompanyPageTemplate, categoryTone, cn } from '~/ui';
import { BOOKING_AREAS, type BookingArea } from './_utils/booking-areas';
import { KeyDestinationCard } from './_components/key-destination-card';
import { countTodayAndUpcomingAppointments } from './_utils/appointment-counts.server';

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const session = await authService.getUserSession(request);
    const response = await withAuth(request, () => AuthController.getPermissions());
    const permissions = response.data?.data;
    const canAdminister = Boolean(
      session.user.companyId &&
        permissions?.companyId === session.user.companyId &&
        permissions.flags?.canAccessBooking &&
        permissions.companyRoles?.includes('ADMIN'),
    );

    // Admins see the loyalty program's real state on its row; without it the row keeps its fixed line.
    const loyalty = canAdminister
      ? await withAuth(request, () => Booking.getLoyaltyRule())
          .then((loyaltyResponse) => loyaltyResponse.data?.data ?? null)
          .catch(() => null)
      : null;

    // The key destinations' numbers: today's avtaler (Kalender) and the upcoming ones (Timebestillinger).
    const { todayCount, upcomingCount } = await countTodayAndUpcomingAppointments(request);

    return { canAdminister, loyalty, todayCount, upcomingCount };
  } catch {
    return { canAdminister: false, loyalty: null, todayCount: null, upcomingCount: null };
  }
}

/**
 * The booking domain's Oversikt (ui-rules: page type Oversikt; blueprint map: references/booking-domain.md).
 * The key destinations, Kalender and Timebestillinger, come first as full-colour cards with one live number each;
 * the other areas follow as one row per area, in the area's fixed colour.
 */
export default function CompanyBookingPage({ loaderData }: Route.ComponentProps) {
  const rootData = useRouteLoaderData<typeof rootLoader>('routes/root.layout');
  const bookingData = useRouteLoaderData<typeof bookingLayoutLoader>('routes/company/booking/company.booking.layout');
  const branches = rootData?.userNavigation?.[RoutePlaceMent.SIDEBAR] ?? [];
  const info = bookingData?.bookingInfo;

  // A page the menu doesn't list itself (e.g. Bookbar tid under Kalender) is open to whoever may open its parent.
  const canOpen = (id: string) => hasBranch(branches, id) || hasBranch(branches, id.slice(0, id.lastIndexOf('.')));

  const visibleAreas = BOOKING_AREAS.flatMap((area) => {
    if (area.adminOnly && !loaderData.canAdminister) return [];
    const opens = area.pages.find(canOpen);
    return opens ? [{ area, href: ROUTES_MAP[opens].href }] : [];
  });
  // "Kalender og timer" is shown as the two key cards instead of a row.
  const everyone = visibleAreas.filter(({ area }) => !area.adminOnly && area.key !== 'workday');
  const showKeyCards = visibleAreas.some(({ area }) => area.key === 'workday');
  const admin = visibleAreas.filter(({ area }) => area.adminOnly);

  // Real state where we have it; otherwise the area's fixed line.
  const { loyalty } = loaderData;
  const lineFor = (area: BookingArea) => {
    if (area.key === 'services' && info) {
      return `${info.servicesAmount} ${info.servicesAmount === 1 ? 'tjeneste' : 'tjenester'} · ${info.serviceGroupsAmount} ${info.serviceGroupsAmount === 1 ? 'gruppe' : 'grupper'}`;
    }
    if (area.key === 'loyalty' && loyalty) {
      return loyalty.enabled ? `Hvert ${loyalty.visitsRequired}. besøk er gratis` : 'Av';
    }
    return area.line;
  };

  return (
    <CompanyPageTemplate title="Booking">
      <nav aria-label="Booking" className="space-y-4">
        {showKeyCards ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <KeyDestinationCard
              href={ROUTES_MAP['company.booking.schedule'].href}
              label="Kalender"
              icon={CalendarDays}
              tone="teal"
              count={loaderData.todayCount}
              countLabel={loaderData.todayCount === 1 ? 'avtale i dag' : 'avtaler i dag'}
            />
            <KeyDestinationCard
              href={ROUTES_MAP['company.booking.appointments'].href}
              label="Timebestillinger"
              icon={ListChecks}
              tone="cyan"
              count={loaderData.upcomingCount}
              countLabel="kommende"
            />
          </div>
        ) : null}
        {everyone.length ? (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
            {everyone.map(({ area, href }) => (
              <li key={area.key}>
                <AreaRow area={area} href={href} line={lineFor(area)} />
              </li>
            ))}
          </ul>
        ) : null}

        {admin.length ? (
          <section
            aria-labelledby="booking-setup"
            className="overflow-hidden rounded-xl border border-border bg-background"
          >
            <h2
              id="booking-setup"
              className="flex items-center justify-between gap-3 border-b border-border bg-slate-100 px-4 py-1.5 text-xs font-semibold text-text-primary sm:px-5"
            >
              Oppsett
              <span className="font-normal text-text-secondary">Admin</span>
            </h2>
            <ul className="divide-y divide-border">
              {admin.map(({ area, href }) => (
                <li key={area.key}>
                  <AreaRow area={area} href={href} line={lineFor(area)} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </nav>
    </CompanyPageTemplate>
  );
}

/** One area: its colored tile, name and one muted line; the whole row opens the area. */
function AreaRow({ area, href, line }: { area: BookingArea; href: string; line: string }) {
  const tone = categoryTone(area.tone);
  const Icon = area.icon;

  return (
    <Link
      to={href}
      className="flex h-15 items-center gap-3 px-4 transition-colors hover:bg-surface-variant-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-interactive sm:px-5"
    >
      <span aria-hidden className={cn('grid size-9 shrink-0 place-items-center rounded-[10px]', tone.tint, tone.ink)}>
        <Icon className="size-5" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-text-primary">{area.label}</span>
        <span className="block truncate text-sm text-text-secondary">{line}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-text-secondary" aria-hidden />
    </Link>
  );
}
