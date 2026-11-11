import { CalendarClock } from 'lucide-react';
import type { Route } from './+types/company.booking.statistics.booking-times.route';
import { ListEmpty, ListRow, ListStrip } from '~/ui';
import { DayCalendar, osloToday } from '../_components/day-calendar';
import { StatCard, StatisticsPage, statisticsDetailHandle } from '../_components/statistics-parts';
import { loadMonthMetrics } from '../_utils/load-month-metrics.server';
import { busyTimeLabel, capitalize, monthName, plural } from '../_utils/month';

export const handle = statisticsDetailHandle;

export async function loader({ request }: Route.LoaderArgs) {
  // Today in Oslo from the server, so the page renders the same on the server and in the browser.
  return { ...(await loadMonthMetrics(request)), today: osloToday() };
}

/** Bestillingstider: avtaler per day of the month, and the busiest weekday + hour. */
export default function CompanyBookingStatisticsBookingTimesPage({ loaderData }: Route.ComponentProps) {
  const { metrics, error, today } = loaderData;

  return (
    <StatisticsPage
      title="Bestillingstider"
      month={metrics?.month ?? null}
      currentMonth={metrics?.currentMonth ?? null}
      error={error}
    >
      {metrics ? (
        metrics.appointments === 0 ? (
          <StatCard label="Bestillingstider">
            <ListEmpty icon={CalendarClock} title={`Ingen avtaler i ${monthName(metrics.month)}`} />
          </StatCard>
        ) : (
          <>
            <StatCard label="Avtaler per dag">
              <ListStrip label="Avtaler per dag" count={`${metrics.appointments} i ${monthName(metrics.month)}`} />
              <DayCalendar days={metrics.appointmentsPerDay} month={metrics.month} today={today} />
            </StatCard>
            <StatCard label="Travleste tider">
              <ListStrip label="Travleste tider" />
              <ul className="divide-y divide-border">
                {metrics.busiestTimes.map((time) => (
                  <li key={`${time.dayOfWeek}-${time.hour}`}>
                    <ListRow
                      title={capitalize(busyTimeLabel(time.dayOfWeek, time.hour))}
                      trailing={plural(time.appointments, 'avtale', 'avtaler')}
                    />
                  </li>
                ))}
              </ul>
            </StatCard>
          </>
        )
      ) : null}
    </StatisticsPage>
  );
}
