import { loader as requireBookingAdmin } from '~/routes/company/booking/admin/company.booking.admin.layout';
import { ServiceAdminSwitch } from '~/routes/company/booking/admin/_components/service-admin-switch';
import { PageCreateButton } from '~/routes/_components/page-create-button';
import { Link } from 'react-router';
import { ChevronRight, Layers } from 'lucide-react';
import { CompanyPageTemplate, categoryTone, cn, PageNotice } from '~/ui';
import type { Route } from './+types/company.booking.admin.service-groups.route';
import { CompanyUserServiceGroupController, ServiceController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { resolveErrorPayload } from '~/lib/api-error';
import type { CreateActionHandle } from '~/lib/routing/create-action';

export const handle = {
  createAction: { label: 'Ny gruppe', to: ROUTES_MAP['company.booking.admin.service-groups.create'].href },
} satisfies CreateActionHandle;

export async function loader({ request }: Route.LoaderArgs) {
  await requireBookingAdmin({ request });
  try {
    // A salon has a handful of groups; load them all, with the services so each row can show its count.
    const [groupsResponse, servicesResponse] = await withAuth(request, async () =>
      Promise.all([
        CompanyUserServiceGroupController.getServiceGroups({ query: { page: 0, size: 1000 } }),
        ServiceController.getServices({ query: { page: 0, size: 1000 } }),
      ]),
    );

    const serviceCountByGroupId: Record<number, number> = {};
    for (const service of servicesResponse.data?.data?.content ?? []) {
      serviceCountByGroupId[service.serviceGroupId] = (serviceCountByGroupId[service.serviceGroupId] ?? 0) + 1;
    }

    return { serviceGroups: groupsResponse.data?.data?.content ?? [], serviceCountByGroupId };
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente tjenestegrupper');
    return { serviceGroups: [], serviceCountByGroupId: {} as Record<number, number>, error: message };
  }
}

export default function BookingServiceGroups({ loaderData }: Route.ComponentProps) {
  const { serviceGroups, serviceCountByGroupId } = loaderData;
  const error = 'error' in loaderData ? loaderData.error : undefined;

  return (
    <CompanyPageTemplate title="Tjenestegrupper">
      <div className="flex items-center gap-4">
        <ServiceAdminSwitch className="flex-1 sm:flex-none" />
        <PageCreateButton />
      </div>

      {error ? <PageNotice title="Kunne ikke hente tjenestegrupper" /> : null}

      <section aria-label="Tjenestegrupper" className="overflow-hidden rounded-xl border border-border bg-background">
        {serviceGroups.length ? (
          <>
            <ul className="divide-y divide-border">
              {serviceGroups.map((group, position) => {
                // Same position, same color as the group's header on Tjenester.
                const tone = categoryTone(position);
                const count = serviceCountByGroupId[group.id] ?? 0;
                return (
                  <li key={group.id}>
                    <Link
                      to={`${ROUTES_MAP['company.booking.admin.service-groups.edit'].href}?id=${group.id}`}
                      className="flex h-15 items-center gap-3 px-4 transition-colors hover:bg-surface-variant-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-interactive sm:px-5"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'grid size-9 shrink-0 place-items-center rounded-[10px] text-sm font-bold',
                          tone.tint,
                          tone.ink,
                        )}
                      >
                        {group.name.trim().charAt(0).toLocaleUpperCase('nb-NO')}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-text-primary">{group.name}</span>
                        <span className="block text-sm text-text-secondary">
                          {count} {count === 1 ? 'tjeneste' : 'tjenester'}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-text-secondary" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-border px-4 py-3 text-sm text-text-secondary sm:px-5">
              {serviceGroups.length} {serviceGroups.length === 1 ? 'gruppe' : 'grupper'}
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-blue-50 text-interactive">
              <Layers className="size-7" aria-hidden />
            </span>
            <p className="text-base font-semibold text-text-primary">Ingen grupper ennå</p>
          </div>
        )}
      </section>
    </CompanyPageTemplate>
  );
}
