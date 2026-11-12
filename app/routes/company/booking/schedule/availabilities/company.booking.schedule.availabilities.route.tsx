import { differenceInMinutes, format } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { CalendarPlus } from 'lucide-react';
import { data } from 'react-router';
import type { Route } from './+types/company.booking.schedule.availabilities.route';
import { Booking, type ScheduleAvailabilityDto } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { formatDateBoundaryInTimeZone } from '~/lib/query';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { PageCreateButton } from '~/routes/_components/page-create-button';
import { CompanyPageTemplate, ListEmpty, ListRow, ListStrip, PageNotice } from '~/ui';
import { AvailabilityAreaSwitch } from '../../_components/availability-area-switch';
import { PeriodSwitch } from '../../_components/period-switch';
import { dayTitle, durationLabel, groupByMonth, periodWindow, readPeriod } from '../../_utils/periods';
import type { CreateActionHandle } from '~/lib/routing/create-action';

export const handle = {
  createAction: { label: 'Ny bookbar tid', to: ROUTES_MAP['company.booking.schedule.availabilities.create'].href },
} satisfies CreateActionHandle;

const TIME_ZONE = 'Europe/Oslo';

export async function loader({ request }: Route.LoaderArgs) {
  const period = readPeriod(new URL(request.url));
  const { start, end } = periodWindow(period, toZonedTime(new Date(), TIME_ZONE));

  try {
    const response = await withAuth(request, async () =>
      Booking.getAvailabilities({
        query: {
          page: 0,
          size: 200,
          fromDateTime: formatDateBoundaryInTimeZone(format(start, 'yyyy-MM-dd'), 'start', TIME_ZONE),
          toDateTime: formatDateBoundaryInTimeZone(format(end, 'yyyy-MM-dd'), 'end', TIME_ZONE),
        },
      }),
    );

    const now = Date.now();
    const items = (response.data?.data?.content ?? [])
      // Kommende: still to end, soonest first. Tidligere: already over, most recent first.
      .filter((item) => (period === 'kommende') === new Date(item.endTime).getTime() >= now)
      .sort((a, b) =>
        period === 'kommende' ? a.startTime.localeCompare(b.startTime) : b.startTime.localeCompare(a.startTime),
      );

    return data({ period, items, error: null as string | null });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke hente bookbar tid');
    return data({ period, items: [] as ScheduleAvailabilityDto[], error: message }, { status: status ?? 400 });
  }
}

/** Tilgjengelighet → Bookbar tid (page type Liste; blueprint map: ui-rules → references/booking-domain.md). */
export default function CompanyBookingScheduleAvailabilitiesPage({ loaderData }: Route.ComponentProps) {
  const { period, items, error } = loaderData;
  const months = groupByMonth(items, (item) => toZonedTime(item.startTime, TIME_ZONE));
  const past = period === 'tidligere';

  return (
    <CompanyPageTemplate title="Bookbar tid">
      <div className="flex items-center gap-4">
        <AvailabilityAreaSwitch className="flex-1 sm:flex-none" />
        <PageCreateButton />
      </div>

      {error ? <PageNotice title="Kunne ikke hente bookbar tid" /> : null}

      <section aria-label="Bookbar tid" className="overflow-hidden rounded-xl border border-border bg-background">
        <div className="p-3 sm:p-5">
          <PeriodSwitch className="w-full sm:w-auto" />
        </div>

        {items.length ? (
          <>
            {months.map((month) => (
              <section key={month.key} aria-labelledby={`month-${month.key}`}>
                <ListStrip id={`month-${month.key}`} label={month.label} count={`${month.items.length} tidsrom`} />
                <ul className="divide-y divide-border">
                  {month.items.map((item) => {
                    const start = new Date(item.startTime);
                    const end = new Date(item.endTime);
                    return (
                      <li key={item.id}>
                        <ListRow
                          // Past time can't be changed, so past rows don't open anything.
                          to={
                            past
                              ? undefined
                              : `${ROUTES_MAP['company.booking.schedule.availabilities.edit'].href}?id=${item.id}`
                          }
                          muted={past}
                          title={dayTitle(toZonedTime(start, TIME_ZONE))}
                          line={`${formatInTimeZone(start, TIME_ZONE, 'HH:mm')}–${formatInTimeZone(end, TIME_ZONE, 'HH:mm')} · ${durationLabel(differenceInMinutes(end, start))}`}
                        />
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            <p className="border-t border-border px-4 py-3 text-sm text-text-secondary sm:px-5">
              {items.length} tidsrom
            </p>
          </>
        ) : (
          <ListEmpty icon={CalendarPlus} title={past ? 'Ingen tidligere bookbar tid' : 'Ingen kommende bookbar tid'} />
        )}
      </section>
    </CompanyPageTemplate>
  );
}
