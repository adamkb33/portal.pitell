import { UsersRound } from 'lucide-react';
import type { Route } from './+types/company.booking.statistics.profiles.route';
import { ListEmpty, ListRow, categoryTone, cn } from '~/ui';
import { StatCard, StatisticsPage, statisticsDetailHandle } from '../_components/statistics-parts';
import { loadMonthMetrics } from '../_utils/load-month-metrics.server';
import { formatKr, initials, plural } from '../_utils/month';

export const handle = statisticsDetailHandle;

export async function loader({ request }: Route.LoaderArgs) {
  return loadMonthMetrics(request);
}

/** Ansatte: each booking profile's avtaler and omsetning for the month, the most omsetning first. */
export default function CompanyBookingStatisticsProfilesPage({ loaderData }: Route.ComponentProps) {
  const { metrics, error } = loaderData;
  const profiles = metrics?.profiles ?? [];

  return (
    <StatisticsPage
      title="Ansatte"
      month={metrics?.month ?? null}
      currentMonth={metrics?.currentMonth ?? null}
      error={error}
    >
      <StatCard label="Ansatte">
        {profiles.length === 0 ? (
          <ListEmpty icon={UsersRound} title="Ingen bookingprofiler" />
        ) : (
          <ul className="divide-y divide-border">
            {profiles.map((profile) => {
              const name = profile.profileName || 'Uten navn';
              const tone = categoryTone(profile.profileId);
              return (
                <li key={profile.profileId}>
                  <ListRow
                    lead={
                      profile.profileImageUrl ? (
                        <img
                          src={profile.profileImageUrl}
                          alt=""
                          className="size-9 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span
                          aria-hidden
                          className={cn(
                            'grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-bold',
                            tone.tint,
                            tone.ink,
                          )}
                        >
                          {initials(name)}
                        </span>
                      )
                    }
                    title={name}
                    line={plural(profile.appointments, 'avtale', 'avtaler')}
                    trailing={formatKr(profile.revenue)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </StatCard>
    </StatisticsPage>
  );
}
