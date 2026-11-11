import { useLocation } from 'react-router';
import type { Route } from './+types/company.booking.statistics.route';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { ListRow } from '~/ui';
import { StatList, StatRow, StatisticsPage } from './_components/statistics-parts';
import { loadMonthMetrics } from './_utils/load-month-metrics.server';
import { busyTimeLabel, compareWithPrevious, formatKr, monthName, plural, shiftMonth } from './_utils/month';

export async function loader({ request }: Route.LoaderArgs) {
  return loadMonthMetrics(request);
}

/** Statistikk (ui-rules → Tall): one card of stat rows for the month, then rows that open the details. */
export default function CompanyBookingStatisticsPage({ loaderData }: Route.ComponentProps) {
  const { metrics, error } = loaderData;
  const { search } = useLocation();

  if (!metrics) {
    return (
      <StatisticsPage title="Statistikk" month={null} currentMonth={null} error={error}>
        {null}
      </StatisticsPage>
    );
  }

  const previousMonth = shiftMonth(metrics.month, -1);
  const isCurrentMonth = metrics.month === metrics.currentMonth;
  const topService = metrics.services[0];
  const topProfile = metrics.profiles[0];
  const busiest = metrics.busiestTimes[0];
  const detail = (id: Parameters<typeof routeHref>[0]) => `${routeHref(id)}${search}`;

  return (
    <StatisticsPage title="Statistikk" month={metrics.month} currentMonth={metrics.currentMonth} error={null}>
      <StatList label={`Tall for ${monthName(metrics.month)}`} columns={2}>
        <StatRow
          label="Omsetning"
          value={formatKr(metrics.revenue)}
          compare={compareWithPrevious(metrics.revenue, metrics.previousRevenue, previousMonth, {
            more: 'høyere',
            less: 'lavere',
          })}
        />
        <StatRow
          label="Avtaler"
          value={metrics.appointments}
          compare={compareWithPrevious(metrics.appointments, metrics.previousAppointments, previousMonth, {
            more: 'flere',
            less: 'færre',
          })}
        />
        {isCurrentMonth && metrics.projectedRevenue != null ? (
          <StatRow label="Prognose" value={formatKr(metrics.projectedRevenue)} compare="For hele måneden" />
        ) : null}
        <StatRow
          label="Snitt per avtale"
          value={formatKr(metrics.averageAppointmentValue)}
          compare={
            metrics.previousAverageAppointmentValue > 0
              ? `${formatKr(metrics.previousAverageAppointmentValue)} i ${monthName(previousMonth)}`
              : null
          }
        />
      </StatList>

      <nav aria-label="Detaljer" className="overflow-hidden rounded-xl border border-border bg-background">
        <ul className="divide-y divide-border">
          <li>
            <ListRow
              to={detail('company.booking.statistics.services')}
              title="Tjenester"
              line={
                topService ? `${topService.serviceName} · ${topService.groupName} er mest bestilt` : 'Ingen avtaler'
              }
            />
          </li>
          <li>
            <ListRow
              to={detail('company.booking.statistics.profiles')}
              title="Ansatte"
              line={
                !topProfile
                  ? 'Ingen bookingprofiler'
                  : metrics.profiles.length === 1
                    ? `${topProfile.profileName ?? 'Uten navn'} · ${formatKr(topProfile.revenue)}`
                    : `${plural(metrics.profiles.length, 'ansatt', 'ansatte')} · ${topProfile.profileName ?? 'Uten navn'} har mest omsetning`
              }
            />
          </li>
          <li>
            <ListRow
              to={detail('company.booking.statistics.customers')}
              title="Kunder"
              line={`${plural(metrics.customers.customers, 'kunde', 'kunder')} · ${metrics.customers.newCustomers} nye`}
            />
          </li>
          <li>
            <ListRow
              to={detail('company.booking.statistics.booking-times')}
              title="Bestillingstider"
              line={busiest ? `Travlest ${busyTimeLabel(busiest.dayOfWeek, busiest.hour)}` : 'Ingen avtaler'}
            />
          </li>
        </ul>
      </nav>
    </StatisticsPage>
  );
}

function routeHref(
  id:
    | 'company.booking.statistics.services'
    | 'company.booking.statistics.profiles'
    | 'company.booking.statistics.customers'
    | 'company.booking.statistics.booking-times',
) {
  return ROUTES_MAP[id].href;
}
