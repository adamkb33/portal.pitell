import { loader as requireBookingAdmin } from '~/routes/company/booking/admin/company.booking.admin.layout';
import { Link } from 'react-router';
import { useMemo, useState } from 'react';
import { ChevronRight, ClipboardList, ImageIcon, Search, SearchX, X } from 'lucide-react';
import { Button, CompanyPageTemplate, Input, categoryTone, cn, PageNotice } from '~/ui';
import { withAuth } from '~/api/utils/with-auth';
import { CompanyUserServiceGroupController, ServiceController, type ServiceDto } from '~/api/generated';
import { redirectWithInfo } from '~/lib/flash-message.server';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { ServiceAdminSwitch } from '~/routes/company/booking/admin/_components/service-admin-switch';
import { PageCreateButton } from '~/routes/_components/page-create-button';
import type { Route } from './+types/company.booking.admin.service-groups.services.route';
import { servicesActions } from './_features/services.feature';
import { formatServicePrice, groupServices } from './_utils/group-services';
import { resolveErrorPayload } from '~/lib/api-error';
import type { CreateActionHandle } from '~/lib/routing/create-action';

export const handle = {
  createAction: { label: 'Ny tjeneste', to: ROUTES_MAP['company.booking.admin.services.create'].href },
} satisfies CreateActionHandle;

export async function loader({ request }: Route.LoaderArgs) {
  await requireBookingAdmin({ request });
  try {
    // A salon has a handful of services, so load them all and group and search on the page.
    const [serviceGroupsResponse, servicesResponse] = await withAuth(request, async () =>
      Promise.all([
        CompanyUserServiceGroupController.getServiceGroups({ query: { page: 0, size: 1000 } }),
        ServiceController.getServices({ query: { page: 0, size: 1000 } }),
      ]),
    );

    const serviceGroups = serviceGroupsResponse.data?.data?.content || [];

    if (serviceGroups.length === 0) {
      return redirectWithInfo(
        request,
        ROUTES_MAP['company.booking.admin.service-groups'].href,
        'Du må opprette en tjenestegruppe før du kan legge til tjenester.',
      );
    }

    return { serviceGroups, services: servicesResponse.data?.data?.content || [] };
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente tjenester');
    return { serviceGroups: [], services: [], error: message };
  }
}

export const action = servicesActions;

export default function BookingAdminServices({ loaderData }: Route.ComponentProps) {
  const { serviceGroups, services } = loaderData;
  const error = 'error' in loaderData ? loaderData.error : undefined;
  const [search, setSearch] = useState('');
  const sections = useMemo(() => groupServices(serviceGroups, services, search), [serviceGroups, services, search]);
  const shownCount = sections.reduce((sum, section) => sum + section.services.length, 0);
  const query = search.trim();

  return (
    <CompanyPageTemplate title="Tjenester">
      <div className="flex items-center gap-4">
        <ServiceAdminSwitch className="flex-1 sm:flex-none" />
        <PageCreateButton />
      </div>

      {error ? <PageNotice title="Kunne ikke hente tjenester" /> : null}

      <section aria-label="Tjenester" className="overflow-hidden rounded-xl border border-border bg-background">
        <div className="relative p-3 sm:p-5">
          <Input
            aria-label="Søk etter tjeneste"
            placeholder="Søk etter tjeneste..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            startIcon={<Search />}
            className="h-11 pr-11 text-base sm:h-10"
          />
          {search ? (
            <button
              type="button"
              aria-label="Tøm søk"
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-text-secondary transition-colors hover:bg-surface-variant-1 focus-visible:outline-2 focus-visible:outline-interactive sm:right-6 sm:size-8"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>

        {sections.map((section) => {
          const tone = section.colorPosition === null ? null : categoryTone(section.colorPosition);
          const headingId = `service-group-${section.key}`;
          return (
            <section key={section.key} aria-labelledby={headingId}>
              <h2
                id={headingId}
                className={cn(
                  'flex items-center gap-2 border-t border-border px-4 py-2 text-sm font-semibold text-text-primary sm:px-5',
                  tone ? tone.tint : 'bg-slate-100',
                )}
              >
                <span
                  aria-hidden
                  className={cn('size-2.5 shrink-0 rounded-full', tone ? tone.dot : 'bg-text-disabled')}
                />
                {section.name}
                <span className="ml-auto font-normal text-text-secondary">
                  {section.services.length} {section.services.length === 1 ? 'tjeneste' : 'tjenester'}
                </span>
              </h2>
              <ul>
                {section.services.map((service) => (
                  <li key={service.id} className="border-t border-border">
                    <ServiceRow service={service} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {shownCount === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 border-t border-border px-6 py-12 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-blue-50 text-interactive">
              {query ? <SearchX className="size-7" aria-hidden /> : <ClipboardList className="size-7" aria-hidden />}
            </span>
            <p className="text-base font-semibold text-text-primary">
              {query ? `Ingen treff på «${query}»` : 'Ingen tjenester ennå'}
            </p>
            {query ? (
              <Button variant="outline" onClick={() => setSearch('')}>
                Tøm søk
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="border-t border-border px-4 py-3 text-sm text-text-secondary sm:px-5">
            {shownCount} {shownCount === 1 ? 'tjeneste' : 'tjenester'}
          </p>
        )}
      </section>
    </CompanyPageTemplate>
  );
}

/** One service: the whole row opens it for editing. */
function ServiceRow({ service }: { service: ServiceDto }) {
  const imageCount = service.images?.length ?? 0;

  return (
    <Link
      to={`${ROUTES_MAP['company.booking.admin.services.edit'].href}?id=${service.id}`}
      className="flex h-15 items-center gap-3 px-4 transition-colors hover:bg-surface-variant-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-interactive sm:px-5"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-text-primary">{service.name}</span>
        <span className="flex items-center gap-1.5 text-sm text-text-secondary">
          {service.duration} min
          {imageCount > 0 ? (
            <span className="inline-flex items-center gap-0.5 text-xs">
              <ImageIcon className="size-3" aria-hidden />
              {imageCount}
              <span className="sr-only"> {imageCount === 1 ? 'bilde' : 'bilder'}</span>
            </span>
          ) : null}
        </span>
      </span>
      <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums text-text-primary">
        {formatServicePrice(service.price)}
      </span>
      <ChevronRight className="size-4 shrink-0 text-text-secondary" aria-hidden />
    </Link>
  );
}
