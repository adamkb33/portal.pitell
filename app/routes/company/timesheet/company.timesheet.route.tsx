import type { loader as rootLoader } from '~/routes/root.layout';
import * as React from 'react';
import { Link, useRouteLoaderData } from 'react-router';
import { CalendarDays, Clock3, PenLine } from 'lucide-react';
import type { Route } from './+types/company.timesheet.route';
import type { TimesheetDayEntryDto } from '~/api/generated';
import { CompanyUserTimesheetEntryController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { CalendarView, type CalendarEntry } from '~/components/calendar/CalendarView';
import { ROUTES_MAP, RoutePlaceMent } from '~/lib/routing/route-tree';
import {
  Button,
  CompanyEmptyState,
  CompanyPageTemplate,
  KpiCard,
  Popover,
  PopoverContent,
  PopoverTrigger,
  PageNotice,
} from '~/ui';
import { parseTimesheetListRequest, serializeTimesheetQuery, TIMESHEET_STATUS_LABELS } from './_utils';

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const url = new URL(request.url);
    const { requestPayload } = parseTimesheetListRequest(url);

    const response = await withAuth(request, () =>
      CompanyUserTimesheetEntryController.getEntries({
        query: { request: requestPayload },
        paramsSerializer: (params) => serializeTimesheetQuery(params.request),
      }),
    );

    return {
      entries: (response.data?.data?.content ?? []).map((entry) => ({
        id: entry.id?.toString() ?? entry.date,
        date: entry.date,
        label: toCalendarEntryLabel(entry),
        href: getEditableEntryHref(entry),
        status: entry.status,
        entryMode: entry.entryMode,
        fromTime: entry.fromTime ?? null,
        toTime: entry.toTime ?? null,
        durationMinutes: entry.durationMinutes,
        note: entry.note ?? null,
        declineReason: entry.declineReason ?? null,
        className: getStatusClassName(entry.status),
      })),
      error: null as string | null,
    };
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente timelister');
    return {
      entries: [],
      error: message,
    };
  }
}

export default function CompanyTimesheetRoute({ loaderData }: Route.ComponentProps) {
  const rootData = useRouteLoaderData<typeof rootLoader>('routes/root.layout');
  const canAdminister = rootData?.userNavigation?.[RoutePlaceMent.SIDEBAR]
    ?.find((branch) => branch.id === 'company')
    ?.children?.find((branch) => branch.id === 'company.timesheet')
    ?.children?.some((branch) => branch.id === 'company.timesheet.admin');
  const entries = loaderData.entries;
  const error = loaderData.error;
  const calendarEntries: CalendarEntry[] = entries.map((entry) => ({
    id: entry.id,
    date: entry.date,
    content: <TimesheetCalendarEntry entry={entry} />,
    className: entry.className,
  }));

  const summary = entries.reduce(
    (acc, entry) => {
      acc.total += 1;
      acc.minutes += entry.durationMinutes;
      acc[entry.status] += 1;
      return acc;
    },
    { total: 0, minutes: 0, SUBMITTED: 0, ACCEPTED: 0, DECLINED: 0 },
  );

  return (
    <CompanyPageTemplate
      title="Timelister"
      description="Kalenderbasert oversikt over egne registreringer i samme kompakte sideoppsett som resten av company-domenet."
      label="Timeregistrering"
      routeLinks={
        canAdminister ? (
          <Button asChild variant="outline" size="sm">
            <Link to={ROUTES_MAP['company.timesheet.admin'].href}>Administrasjon</Link>
          </Button>
        ) : undefined
      }
      actions={
        <Button asChild size="sm">
          <Link to={ROUTES_MAP['company.timesheet.register'].href}>Ny registrering</Link>
        </Button>
      }
      hero={
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <KpiCard
            label="Registreringer"
            value={summary.total}
            icon={<CalendarDays className="h-5 w-5" />}
            tone="primary"
          />
          <KpiCard
            label="Timer totalt"
            value={formatDurationHours(summary.minutes)}
            icon={<Clock3 className="h-5 w-5" />}
            tone="info"
          />
          <KpiCard label="Sendt inn" value={summary.SUBMITTED} icon={<PenLine className="h-5 w-5" />} tone="warning" />
          <KpiCard label="Godkjent" value={summary.ACCEPTED} icon={<Clock3 className="h-5 w-5" />} tone="success" />
        </div>
      }
    >
      {error ? (
        <PageNotice title="Kunne ikke hente timelister" />
      ) : entries.length === 0 ? (
        <CompanyEmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          title="Ingen registreringer ennå"
          description="Du har ingen timeregistreringer i den valgte perioden. Start med en ny registrering."
        />
      ) : (
        <CalendarView entries={calendarEntries} />
      )}
    </CompanyPageTemplate>
  );
}

function toCalendarEntryLabel(entry: TimesheetDayEntryDto) {
  if (entry.entryMode === 'RANGE' && entry.fromTime && entry.toTime) {
    return `${entry.fromTime.slice(0, 5)}-${entry.toTime.slice(0, 5)}`;
  }

  const hours = (entry.durationMinutes / 60).toLocaleString('nb-NO', {
    minimumFractionDigits: entry.durationMinutes % 60 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  });

  return `${hours}t`;
}

function TimesheetCalendarEntry({ entry }: { entry: Route.ComponentProps['loaderData']['entries'][number] }) {
  const [open, setOpen] = React.useState(false);
  const trigger = entry.href ? (
    <Link
      to={entry.href}
      className="block w-full hover:underline"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {entry.label}
    </Link>
  ) : (
    <button
      type="button"
      className="block w-full cursor-default text-left"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {entry.label}
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className="w-56 space-y-2 p-3"
        align="start"
        side="top"
        sideOffset={6}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-text-primary">{entry.label}</p>
          <span className="text-[10px] font-medium uppercase tracking-wide text-text-secondary">
            {TIMESHEET_STATUS_LABELS[entry.status]}
          </span>
        </div>
        <div className="space-y-1 text-[11px] leading-4 text-text-secondary">
          <p>{entry.entryMode === 'RANGE' ? 'Tidsintervall' : 'Timer'}</p>
          {entry.entryMode === 'RANGE' && entry.fromTime && entry.toTime ? (
            <p>
              {entry.fromTime.slice(0, 5)} - {entry.toTime.slice(0, 5)}
            </p>
          ) : (
            <p>{formatDurationHours(entry.durationMinutes)}</p>
          )}
          {entry.note ? <p className="line-clamp-2 text-text-primary">{entry.note}</p> : null}
          {entry.declineReason ? <p className="line-clamp-3 text-destructive">Avvist: {entry.declineReason}</p> : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function formatDurationHours(durationMinutes: number) {
  const hours = (durationMinutes / 60).toLocaleString('nb-NO', {
    minimumFractionDigits: durationMinutes % 60 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  });

  return `${hours} timer`;
}

function getEditableEntryHref(entry: TimesheetDayEntryDto) {
  if (entry.id == null) return undefined;
  if (entry.status !== 'SUBMITTED' && entry.status !== 'DECLINED') return undefined;

  if (entry.entryMode === 'RANGE') {
    return ROUTES_MAP['company.timesheet.edit-range'].href.replace(':id', entry.id.toString());
  }

  return ROUTES_MAP['company.timesheet.edit-hours'].href.replace(':id', entry.id.toString());
}

function getStatusClassName(status: TimesheetDayEntryDto['status']): CalendarEntry['className'] {
  switch (status) {
    case 'ACCEPTED':
      return 'bg-surface';
    case 'SUBMITTED':
      return 'bg-surface';
    case 'DECLINED':
      return 'bg-surface';
    default:
      return 'bg-surface';
  }
}
