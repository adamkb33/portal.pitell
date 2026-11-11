import { data, Link, redirect, useRouteLoaderData } from 'react-router';
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Clock,
  FileText,
  MapPin,
  Megaphone,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { CompanyUserController, CompanyUserInAppNotificationController, type AddressDto } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { getAuthPayloadFromRequest } from '~/lib/auth.utils';
import { resolveErrorPayload } from '~/lib/api-error';
import { redirectWithError } from '~/lib/flash-message.server';
import { serializeQueryParams } from '~/lib/query';
import { hasBranch } from '~/lib/routing/has-branch';
import { ROUTES_MAP, RoutePlaceMent } from '~/lib/routing/route-tree';
import type { loader as rootLoader } from '~/routes/root.layout';
import { KeyDestinationCard } from '~/routes/company/booking/_components/key-destination-card';
import { countTodayAndUpcomingAppointments } from '~/routes/company/booking/_utils/appointment-counts.server';
import { UNREAD_COUNT_REQUEST } from '~/routes/company/notifications/_utils/query';
import { CompanyPageTemplate, cn } from '~/ui';
import type { Route } from './+types/company.route';

async function countUnreadNotifications(request: Request): Promise<number | null> {
  try {
    const response = await withAuth(request, () =>
      CompanyUserInAppNotificationController.getInAppNotifications({
        query: { request: UNREAD_COUNT_REQUEST },
        paramsSerializer: (params) => serializeQueryParams(params.request),
      }),
    );
    return response.data?.data?.totalElements ?? null;
  } catch {
    return null;
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const auth = await getAuthPayloadFromRequest(request);
  if (!auth || !auth.companyId) {
    return redirect(ROUTES_MAP['user.company-context'].href);
  }

  try {
    const [summaryResponse, counts, unreadCount] = await Promise.all([
      withAuth(request, () => CompanyUserController.getCompanySummary()),
      countTodayAndUpcomingAppointments(request),
      countUnreadNotifications(request),
    ]);
    return data({ companySummary: summaryResponse.data?.data ?? null, ...counts, unreadCount });
  } catch (error) {
    const { status, message } = resolveErrorPayload(error, 'Kunne ikke hente selskapsinformasjon.');
    if (status === 401 || status === 403) {
      return redirectWithError(
        request,
        ROUTES_MAP['user.company-context'].href,
        'Du har ikke tilgang til valgt selskapskontekst. Velg selskap på nytt.',
      );
    }
    return redirectWithError(request, ROUTES_MAP['user.company-context'].href, message);
  }
}

type Area = { id: string; label: string; icon: LucideIcon; tone: string; line: string };

/**
 * Oversikt (approved sketch 2026-11-11): the app's front page leads to its areas (ui-rules → Page types, Oversikt).
 * Two key cards with one live number (Kalender today, unread Varsler), one row per area the user can open, and the
 * company as one row with "Endre" for admins. No registry numbers as tiles, no quick looks at other pages' lists.
 */
export default function CompanyIndex({ loaderData }: Route.ComponentProps) {
  const { companySummary, todayCount, upcomingCount, unreadCount } = loaderData;
  const rootData = useRouteLoaderData<typeof rootLoader>('routes/root.layout');
  const branches = rootData?.userNavigation?.[RoutePlaceMent.SIDEBAR] ?? [];
  const can = (id: string) => hasBranch(branches, id);

  // Each area in its fixed colour (Booking teal, Tilbud orange, Timelister purple, Markedsføring pink).
  const areas: Area[] = [
    {
      id: 'company.booking',
      label: 'Booking',
      icon: CalendarDays,
      tone: 'bg-category-teal-tint text-category-teal-ink',
      line:
        upcomingCount === null
          ? 'Kalender og timebestillinger'
          : `${upcomingCount} kommende ${upcomingCount === 1 ? 'avtale' : 'avtaler'}`,
    },
    {
      id: 'company.offer',
      label: 'Tilbud',
      icon: FileText,
      tone: 'bg-category-orange-tint text-category-orange-ink',
      line: 'Tilbud og varekatalog',
    },
    {
      id: 'company.timesheet',
      label: 'Timelister',
      icon: Clock,
      tone: 'bg-category-purple-tint text-category-purple-ink',
      line: 'Registrerte timer',
    },
    {
      id: 'company.marketing',
      label: 'Markedsføring',
      icon: Megaphone,
      tone: 'bg-category-pink-tint text-category-pink-ink',
      line: 'E-post og SMS til kunder',
    },
    {
      id: 'company.admin',
      label: 'Administrasjon',
      icon: Settings,
      tone: 'bg-surface-variant-1 text-text-secondary',
      line: 'Ansatte og kontakter',
    },
  ].filter((area) => can(area.id));

  const showCalendar = can('company.booking.schedule');
  const showNotifications = can('company.notifications');
  const address = formatAddress(companySummary?.businessAddress ?? companySummary?.postalAddress);

  return (
    <CompanyPageTemplate title="Oversikt">
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,35rem)_minmax(0,26rem)] lg:gap-6">
        <div className="flex flex-col gap-4">
          {showCalendar || showNotifications ? (
            <div className="grid grid-cols-2 gap-3">
              {showCalendar ? (
                <KeyDestinationCard
                  href={ROUTES_MAP['company.booking.schedule'].href}
                  label="Kalender"
                  icon={CalendarDays}
                  tone="teal"
                  count={todayCount}
                  countLabel={todayCount === 1 ? 'avtale i dag' : 'avtaler i dag'}
                />
              ) : null}
              {showNotifications ? (
                <KeyDestinationCard
                  href={ROUTES_MAP['company.notifications'].href}
                  label="Varsler"
                  icon={Bell}
                  tone="blue"
                  count={unreadCount}
                  countLabel={unreadCount === 1 ? 'ulest' : 'uleste'}
                />
              ) : null}
            </div>
          ) : null}

          {areas.length > 0 ? (
            <nav aria-label="Områder" className="overflow-hidden rounded-xl border border-border bg-background">
              <ul className="divide-y divide-border">
                {areas.map((area) => (
                  <li key={area.id}>
                    <Row
                      to={ROUTES_MAP[area.id].href}
                      icon={area.icon}
                      tone={area.tone}
                      title={area.label}
                      line={area.line}
                    />
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>

        {companySummary ? (
          <section aria-label="Selskap" className="overflow-hidden rounded-xl border border-border bg-background">
            <div className="flex min-h-15 items-center gap-3 px-4 py-2.5 sm:px-5">
              <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-interactive text-sm font-bold text-text-inverse"
              >
                {initials(companySummary.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-text-primary">{companySummary.name}</span>
                <span className="block truncate text-sm text-text-secondary">
                  {[
                    companySummary.orgNumber ? `Org.nr ${formatOrgNumber(companySummary.orgNumber)}` : null,
                    companySummary.organizationType?.description,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              {can('company.admin.settings') ? (
                <Link
                  to={ROUTES_MAP['company.admin.settings'].href}
                  aria-label="Endre selskapet"
                  className="inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-semibold text-text-primary ring-1 ring-border transition-colors ring-inset hover:bg-surface-variant-1 focus-visible:outline-2 focus-visible:outline-interactive lg:min-h-9"
                >
                  Endre
                </Link>
              ) : null}
            </div>
            {address ? (
              <div className="flex min-h-15 items-center gap-3 border-t border-border px-4 py-2.5 sm:px-5">
                <span
                  aria-hidden
                  className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface-variant-1 text-text-secondary"
                >
                  <MapPin className="size-5" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-text-primary">{address}</span>
                  <span className="block text-sm text-text-secondary">Forretningsadresse</span>
                </span>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </CompanyPageTemplate>
  );
}

/** One area: its coloured tile, name and one muted line; the whole row opens the area. */
function Row({
  to,
  icon: Icon,
  tone,
  title,
  line,
}: {
  to: string;
  icon: LucideIcon;
  tone: string;
  title: string;
  line: string;
}) {
  return (
    <Link
      to={to}
      className="flex h-15 items-center gap-3 px-4 transition-colors hover:bg-surface-variant-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-interactive sm:px-5"
    >
      <span aria-hidden className={cn('grid size-9 shrink-0 place-items-center rounded-[10px]', tone)}>
        <Icon className="size-5" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-text-primary">{title}</span>
        <span className="block truncate text-sm text-text-secondary">{line}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-text-secondary" aria-hidden />
    </Link>
  );
}

const initials = (name?: string) =>
  (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('') || '?';

/** 927491745 → "927 491 745", as Brønnøysund writes it. */
const formatOrgNumber = (orgNumber: string) => orgNumber.replace(/^(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3');

/** "Brogata 12, 1608 Fredrikstad" */
function formatAddress(address?: AddressDto | null): string {
  if (!address) return '';
  const place = [address.postalCode, address.city].filter(Boolean).join(' ');
  return [...(address.addressLines ?? []), place].filter(Boolean).join(', ');
}
