import { useMemo, useState } from 'react';
import { logger } from '~/lib/logger';
import { data, Link, useNavigation } from 'react-router';
import type { Route } from './+types/booking.public.appointment.route';
import { AppointmentsController, type CompanySummaryDto } from '~/api/generated';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { resolveErrorPayload } from '~/lib/api-error';
import { parseBookingContext, resolveBookingTheme } from '~/lib/booking-context.server';
import type { BookingThemeKey } from '~/lib/booking-theme';
import { cn, Container, Input, Notice } from '~/ui';
import { ChevronRight, Loader2, Search } from 'lucide-react';
import { formatCompanyName } from '~/routes/booking/public/_utils/booking-company-name';

export async function loader({ request, url }: Route.LoaderArgs) {
  try {
    const context = await parseBookingContext(request);
    const urlTheme = url.searchParams.has('theme') ? resolveBookingTheme(url.searchParams.get('theme')) : null;
    const theme = urlTheme ?? context.theme;
    const response = await AppointmentsController.getBookingReadyCompanies();
    const companies = response.data?.data ?? [];

    if (!response.data?.data) {
      const message = response.data?.message || 'Kunne ikke hente timebestillinger';
      logger.warn('[booking-companies] missing data payload', {
        message,
        status: response.status,
      });
      return data({ companies: [], theme, error: message }, { status: 400 });
    }

    return data({ companies, theme, error: null as string | null });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke hente timebestillinger');
    logger.error('[booking-companies] loader failed', {
      message,
      status,
    });
    return data({ companies: [], theme: 'pitell' as BookingThemeKey, error: message }, { status: status ?? 400 });
  }
}

export async function action({ request: _request }: Route.ActionArgs) {
  return data(null, { status: 405 });
}

const toTitleCase = (value: string) => (value === value.toUpperCase() ? formatCompanyName(value) : value);

/** "Brogata 12, Fredrikstad": enough for a customer to recognise the place. */
export function buildShortAddress(company: CompanySummaryDto): string | null {
  const address = company.businessAddress || company.postalAddress;
  if (!address) return null;
  const street = address.addressLines?.join(' ') || '';
  const city = address.city || address.municipality || '';
  return [street, city ? toTitleCase(city) : ''].filter(Boolean).join(', ') || null;
}

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('') || '?';

/** Search only earns its place once there are a handful of places to choose between. */
const SEARCH_THRESHOLD = 5;

export default function AppointmentsRoute({ loaderData }: Route.ComponentProps) {
  const companies = loaderData.companies ?? [];
  const theme = loaderData.theme;
  const error = loaderData.error;
  const errorMessage = typeof error === 'string' ? error : (error?.value ?? null);
  const [search, setSearch] = useState('');
  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(null);
  const navigation = useNavigation();
  const isNavigatingToSession = useMemo(() => {
    if (navigation.state === 'idle') return false;
    const targetPath = ROUTES_MAP['booking.public.appointment.session'].href;
    return navigation.location?.pathname?.startsWith(targetPath) ?? false;
  }, [navigation.location?.pathname, navigation.state]);

  const places = companies.map((company) => {
    const name = formatCompanyName(company.name || `Selskap ${company.orgNumber}`);
    return { company, name, address: buildShortAddress(company) };
  });
  const searchLower = search.trim().toLocaleLowerCase('nb-NO');
  const visiblePlaces = searchLower
    ? places.filter((place) => `${place.name} ${place.address ?? ''}`.toLocaleLowerCase('nb-NO').includes(searchLower))
    : places;

  return (
    <Container gutter="none" size="lg">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <h1 className="font-display text-2xl font-bold leading-tight tracking-tight md:text-3xl">
          Hvor vil du bestille?
        </h1>

        {errorMessage ? (
          <Notice variant="booking" tone="emphasis" title="Kunne ikke hente steder" message={errorMessage} />
        ) : null}

        {companies.length > SEARCH_THRESHOLD ? (
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
              aria-hidden
            />
            <Input
              type="search"
              aria-label="Søk etter navn eller sted"
              placeholder="Søk etter navn eller sted"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-11 bg-background pl-9"
            />
          </div>
        ) : null}

        {companies.length === 0 && !errorMessage ? (
          <p className="rounded-xl border border-border bg-background p-4 text-center text-sm text-text-secondary">
            Ingen steder tar imot bestillinger akkurat nå.
          </p>
        ) : null}

        {places.length > 0 ? (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-background">
            {visiblePlaces.map(({ company, name, address }) => {
              const startParams = new URLSearchParams({ companyId: String(company.id) });
              if (theme && theme !== 'pitell') {
                startParams.set('theme', theme);
              }
              const startUrl = `${ROUTES_MAP['booking.public.appointment.session'].href}?${startParams.toString()}`;
              const isLoading = isNavigatingToSession && activeCompanyId === company.id;

              return (
                <li key={company.id}>
                  <Link
                    to={startUrl}
                    onClick={(event) => {
                      if (isNavigatingToSession) {
                        event.preventDefault();
                        return;
                      }
                      setActiveCompanyId(company.id);
                    }}
                    aria-disabled={isNavigatingToSession}
                    aria-label={`Bestill hos ${name}`}
                    className={cn(
                      'flex items-center gap-3 px-4 py-4 transition-colors hover:bg-surface-variant-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-booking-action-text sm:px-5',
                      isNavigatingToSession && !isLoading && 'pointer-events-none opacity-60',
                    )}
                  >
                    <span
                      aria-hidden
                      className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] bg-booking-action-muted text-sm font-semibold text-booking-action-text"
                    >
                      {getInitials(name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold leading-snug text-text-primary">{name}</span>
                      {address ? <span className="block truncate text-sm text-text-secondary">{address}</span> : null}
                    </span>
                    {isLoading ? (
                      <Loader2
                        className="h-4 w-4 shrink-0 animate-spin text-booking-action-text"
                        aria-label="Starter"
                      />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-text-disabled" aria-hidden />
                    )}
                  </Link>
                </li>
              );
            })}
            {visiblePlaces.length === 0 ? (
              <li className="p-4 text-center text-sm text-text-secondary">Fant ingen steder som passer søket.</li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </Container>
  );
}
