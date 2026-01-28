import type { CSSProperties } from 'react';
import type { TimesheetDayEntryDto } from '~/api/generated/timesheet';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { FileText, Pencil } from 'lucide-react';
import { Link } from 'react-router';
import { TIMESHEET_SUBMITTED_STATUS_LABELS, TIMESHEET_SUBMITTED_STATUS_VARIANTS } from '../../_utils';
import { CALENDAR_START_HOUR, SLOT_HEIGHT_PX } from './constants';
import { clampEntryWindow, formatEntryLabel, resolveEntryWindow } from './time-utils';

type SubmittedEntryBlockProps = {
  entry: TimesheetDayEntryDto;
  editHref?: string;
};

export function SubmittedEntryBlock({ entry, editHref }: SubmittedEntryBlockProps) {
  const window = resolveEntryWindow(entry);
  const clampedWindow = window ? clampEntryWindow(window) : null;

  if (!clampedWindow) {
    return null;
  }

  const top = ((clampedWindow.startMinutes - CALENDAR_START_HOUR * 60) / 60) * SLOT_HEIGHT_PX;
  const height = Math.max(((clampedWindow.endMinutes - clampedWindow.startMinutes) / 60) * SLOT_HEIGHT_PX, 20);

  const blockStyle = {
    top: `${top}px`,
    height: `${height}px`,
  } as CSSProperties;

  const note = entry.note?.trim();

  return (
    <div
      className="absolute inset-x-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 shadow-sm"
      style={blockStyle}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-foreground">{formatEntryLabel(entry)}</p>
          <p className="truncate text-[10px] text-muted-foreground">
            {entry.entryMode === 'RANGE' ? 'Intervall' : 'Timer'}
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          {note && (
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="size-5 shrink-0">
                  <FileText className="size-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="end">
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Notat</p>
                <p className="whitespace-pre-wrap text-sm">{note}</p>
              </PopoverContent>
            </Popover>
          )}
          {editHref && (
            <Button asChild type="button" variant="ghost" size="icon" className="size-5 shrink-0">
              <Link to={editHref} aria-label="Oppdater registrering">
                <Pencil className="size-3.5" />
              </Link>
            </Button>
          )}
        </div>
      </div>
      <div className="mt-1">
        <Badge variant={TIMESHEET_SUBMITTED_STATUS_VARIANTS[entry.status]} className="px-1.5 py-0 text-[10px]">
          {TIMESHEET_SUBMITTED_STATUS_LABELS[entry.status]}
        </Badge>
      </div>
    </div>
  );
}
