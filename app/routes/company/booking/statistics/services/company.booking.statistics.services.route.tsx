import { ClipboardList } from 'lucide-react';
import type { Route } from './+types/company.booking.statistics.services.route';
import { CompanyUserServiceGroupController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { ListEmpty, ListRow, categoryTone, cn } from '~/ui';
import { StatCard, StatisticsPage, statisticsDetailHandle } from '../_components/statistics-parts';
import { loadMonthMetrics } from '../_utils/load-month-metrics.server';
import { formatKr, monthName, plural } from '../_utils/month';
import { groupServiceMetrics } from '../_utils/group-service-metrics';

export const handle = statisticsDetailHandle;

export async function loader({ request }: Route.LoaderArgs) {
  const [result, groupIds] = await Promise.all([loadMonthMetrics(request), loadServiceGroupOrder(request)]);
  return { ...result, groupIds };
}

/** The groups in the order of the Tjenester page, so every group keeps its color there and here. */
async function loadServiceGroupOrder(request: Request): Promise<number[]> {
  try {
    const response = await withAuth(request, () =>
      CompanyUserServiceGroupController.getServiceGroups({ query: { page: 0, size: 1000 } }),
    );
    return (response.data?.data?.content ?? []).flatMap((group) => (group.id == null ? [] : [group.id]));
  } catch {
    return [];
  }
}

export default function CompanyBookingStatisticsServicesPage({ loaderData }: Route.ComponentProps) {
  const { metrics, error, groupIds } = loaderData;
  const groups = metrics ? groupServiceMetrics(metrics.services, groupIds) : [];

  return (
    <StatisticsPage
      title="Tjenester"
      month={metrics?.month ?? null}
      currentMonth={metrics?.currentMonth ?? null}
      error={error}
    >
      <StatCard label="Tjenester">
        {groups.length === 0 ? (
          <ListEmpty icon={ClipboardList} title={metrics ? `Ingen avtaler i ${monthName(metrics.month)}` : ''} />
        ) : (
          groups.map((group) => {
            const tone = categoryTone(group.colorPosition);
            const headingId = `service-group-${group.groupId}`;
            return (
              <section key={group.groupId} aria-labelledby={headingId} className="[&:first-child>h2]:border-t-0">
                <h2
                  id={headingId}
                  className={cn(
                    'flex items-center gap-2 border-t border-border px-4 py-2 text-sm font-semibold text-text-primary sm:px-5',
                    tone.tint,
                  )}
                >
                  <span aria-hidden className={cn('size-2.5 shrink-0 rounded-full', tone.dot)} />
                  {group.groupName}
                  <span className="ml-auto font-normal tabular-nums text-text-secondary">
                    {formatKr(group.revenue)}
                  </span>
                </h2>
                <ul className="divide-y divide-border border-t border-border">
                  {group.services.map((service) => (
                    <li key={service.serviceId}>
                      <ListRow
                        title={service.serviceName}
                        line={plural(service.appointments, 'avtale', 'avtaler')}
                        trailing={formatKr(service.revenue)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </StatCard>
    </StatisticsPage>
  );
}
