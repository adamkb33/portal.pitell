import * as React from 'react';
import { Link } from 'react-router';
import type { Route } from './+types/company.timesheet.route';
import type { TimesheetDayEntryDto } from '~/api/generated/timesheet';
import { CompanyUserTimesheetEntryController } from '~/api/generated/timesheet';
import { withAuth } from '~/api/utils/with-auth';
import { CalendarView, type CalendarEntry } from '~/components/calendar/CalendarView';
import { Button } from '~/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { ROUTES_MAP } from '~/lib/route-tree';
import { parseTimesheetListRequest, serializeTimesheetQuery, TIMESHEET_STATUS_LABELS } from './_utils';

export async function loader({ request }: Route.LoaderArgs) {
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
  };
}

export default function CompanyTimesheetRoute({ loaderData }: Route.ComponentProps) {
  const entries: CalendarEntry[] = loaderData.entries.map((entry) => ({
    id: entry.id,
    date: entry.date,
    content: <TimesheetCalendarEntry entry={entry} />,
    className: entry.className,
  }));

  return (
    <div className="space-y-4">
      <CalendarView
        entries={entries}
        header={
          <Button asChild>
            <Link to={ROUTES_MAP['company.timesheet.register'].href}>Ny registrering</Link>
          </Button>
        }
      />
    </div>
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

function TimesheetCalendarEntry({
  entry,
}: {
  entry: Route.ComponentProps['loaderData']['entries'][number];
}) {
  const [open, setOpen] = React.useState(false);
  const trigger = entry.href ? (
    <Link
      to={entry.href}
      className="block w-full hover:underline"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {entry.label}
    </Link>
  ) : (
    <div className="block w-full cursor-default" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {entry.label}
    </div>
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
          <p className="text-xs font-semibold text-foreground">{entry.label}</p>
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {TIMESHEET_STATUS_LABELS[entry.status]}
          </span>
        </div>
        <div className="space-y-1 text-[11px] leading-4 text-muted-foreground">
          <p>{entry.entryMode === 'RANGE' ? 'Tidsintervall' : 'Timer'}</p>
          {entry.entryMode === 'RANGE' && entry.fromTime && entry.toTime ? (
            <p>
              {entry.fromTime.slice(0, 5)} - {entry.toTime.slice(0, 5)}
            </p>
          ) : (
            <p>{formatDurationHours(entry.durationMinutes)}</p>
          )}
          {entry.note ? <p className="line-clamp-2 text-foreground/80">{entry.note}</p> : null}
          {entry.declineReason ? <p className="text-destructive line-clamp-3">Avvist: {entry.declineReason}</p> : null}
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
      return 'bg-secondary/30';
    case 'SUBMITTED':
      return 'bg-primary/30';
    case 'DECLINED':
      return 'bg-destructive/30';
    default:
      return 'bg-muted';
  }
}
