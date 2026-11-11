import type { Route } from './+types/company.booking.statistics.customers.route';
import { StatList, StatRow, StatisticsPage, statisticsDetailHandle } from '../_components/statistics-parts';
import { loadMonthMetrics } from '../_utils/load-month-metrics.server';
import { monthName } from '../_utils/month';

export const handle = statisticsDetailHandle;

export async function loader({ request }: Route.LoaderArgs) {
  return loadMonthMetrics(request);
}

/** Kunder: how many customers had an avtale this month, and how many of them were new. */
export default function CompanyBookingStatisticsCustomersPage({ loaderData }: Route.ComponentProps) {
  const { metrics, error } = loaderData;

  return (
    <StatisticsPage
      title="Kunder"
      month={metrics?.month ?? null}
      currentMonth={metrics?.currentMonth ?? null}
      error={error}
    >
      {metrics ? (
        <StatList label={`Kunder i ${monthName(metrics.month)}`}>
          <StatRow label="Kunder" value={metrics.customers.customers} />
          <StatRow label="Nye kunder" value={metrics.customers.newCustomers} compare="Første avtale" />
          <StatRow label="Kommer igjen" value={metrics.customers.returningCustomers} compare="Har vært her før" />
        </StatList>
      ) : null}
    </StatisticsPage>
  );
}
