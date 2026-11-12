import type { Route } from './+types/company.booking.schedule-unavailability.route';
import { CompanyUserScheduleUnavailabilityController, type ScheduleUnavailabilityGroupDto } from '~/api/generated';
import { format, toZonedTime } from 'date-fns-tz';
import { data } from 'react-router';
import { CalendarOff } from 'lucide-react';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { formatDateBoundaryInTimeZone } from '~/lib/query';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { PageCreateButton } from '~/routes/_components/page-create-button';
import { CompanyPageTemplate, ListEmpty, ListRow, ListStrip, Notice } from '~/ui';
import { AvailabilityAreaSwitch } from '../_components/availability-area-switch';
import { PeriodSwitch } from '../_components/period-switch';
import { groupByMonth, periodWindow, readPeriod } from '../_utils/periods';
import { absenceLine, absenceTitle, isPastAbsence } from './_utils/absence';
import type { CreateActionHandle } from '~/lib/routing/create-action';

export const handle = {
  createAction: { label: 'Nytt fravær', to: ROUTES_MAP['company.booking.schedule-unavailability.create'].href },
} satisfies CreateActionHandle;

const TIME_ZONE = 'Europe/Oslo';

export async function loader({ request }: Route.LoaderArgs) {
  const period = readPeriod(new URL(request.url));
  const { start, end } = periodWindow(period, toZonedTime(new Date(), TIME_ZONE));

  try {
    const response = await withAuth(request, async () =>
      CompanyUserScheduleUnavailabilityController.companyUserGetGroupedUnavailabilityRanges({
        query: {
          fromDateTime: formatDateBoundaryInTimeZone(format(start, 'yyyy-MM-dd'), 'start', TIME_ZONE),
          toDateTime: formatDateBoundaryInTimeZone(format(end, 'yyyy-MM-dd'), 'end', TIME_ZONE),
        },
      }),
    );

    const now = Date.now();
    const groups = (response.data?.data ?? [])
      // Kommende: not over yet, soonest first. Tidligere: over, most recent first.
      .filter((group) => (period === 'tidligere') === isPastAbsence(group, now))
      .sort((a, b) => (period === 'kommende' ? a.from.localeCompare(b.from) : b.from.localeCompare(a.from)));

    return data({ period, groups, error: null as string | null });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke hente fravær');
    return data({ period, groups: [] as ScheduleUnavailabilityGroupDto[], error: message }, { status: status ?? 400 });
  }
}

/** The page that opens one absence (it can't be edited, only looked at and deleted). */
export function absenceHref(group: ScheduleUnavailabilityGroupDto): string {
  const params = new URLSearchParams({ id: group.id, from: group.from, to: group.to });
  return `${ROUTES_MAP['company.booking.schedule-unavailability.detail'].href}?${params.toString()}`;
}

/** Tilgjengelighet → Fravær (page type Liste; blueprint map: ui-rules → references/booking-domain.md). */
export default function CompanyBookingScheduleUnavailabilityRoute({ loaderData }: Route.ComponentProps) {
  const { period, groups, error } = loaderData;
  const months = groupByMonth(groups, (group) => toZonedTime(group.from, TIME_ZONE));
  const past = period === 'tidligere';
  const periods = (count: number) => `${count} ${count === 1 ? 'periode' : 'perioder'}`;

  return (
    <CompanyPageTemplate title="Fravær">
      <div className="flex items-center gap-4">
        <AvailabilityAreaSwitch className="flex-1 sm:flex-none" />
        <PageCreateButton />
      </div>

      {error ? <Notice tone="emphasis" title="Kunne ikke hente fravær" message={error} /> : null}

      <section aria-label="Fravær" className="overflow-hidden rounded-xl border border-border bg-background">
        <div className="p-3 sm:p-5">
          <PeriodSwitch className="w-full sm:w-auto" />
        </div>

        {groups.length ? (
          <>
            {months.map((month) => (
              <section key={month.key} aria-labelledby={`month-${month.key}`}>
                <ListStrip id={`month-${month.key}`} label={month.label} count={periods(month.items.length)} />
                <ul className="divide-y divide-border">
                  {month.items.map((group) => (
                    <li key={group.id}>
                      <ListRow
                        // Past absence is history: nothing to open or delete.
                        to={past ? undefined : absenceHref(group)}
                        muted={past}
                        title={absenceTitle(group)}
                        line={absenceLine(group)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <p className="border-t border-border px-4 py-3 text-sm text-text-secondary sm:px-5">
              {periods(groups.length)}
            </p>
          </>
        ) : (
          <ListEmpty icon={CalendarOff} title={past ? 'Ingen tidligere fravær' : 'Ingen kommende fravær'} />
        )}
      </section>
    </CompanyPageTemplate>
  );
}
