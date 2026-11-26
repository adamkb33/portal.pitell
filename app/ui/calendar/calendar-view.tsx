import * as React from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '~/lib/utils';
import { Button } from '~/ui';

export type CalendarEntry = {
  date: string | Date;
  content: React.ReactNode;
  id?: string;
  className?: string;
};

export type CalendarViewProps = {
  entries?: CalendarEntry[];
  className?: string;
  header?: React.ReactNode;
  month?: Date;
  initialMonth?: Date;
  onMonthChange?: (month: Date) => void;
  showOutsideDays?: boolean;
};

const OSLO_TZ = 'Europe/Oslo';
const LOCALE = 'nb-NO';
const MAX_VISIBLE_ENTRIES = 3;

export function CalendarView({
  entries = [],
  className,
  header,
  month,
  initialMonth,
  onMonthChange,
  showOutsideDays = true,
}: CalendarViewProps) {
  const todayKey = React.useMemo(() => toOsloDateKey(new Date()), []);

  const [internalMonth, setInternalMonth] = React.useState<Date>(() => {
    if (month) return startOfMonthUTC(month);
    if (initialMonth) return startOfMonthUTC(initialMonth);
    return startOfMonthUTC(new Date());
  });

  React.useEffect(() => {
    if (month) setInternalMonth(startOfMonthUTC(month));
  }, [month]);

  const activeMonth = month ? startOfMonthUTC(month) : internalMonth;

  const entriesByDate = React.useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const entry of entries) {
      const key = toOsloDateKey(entry.date);
      const bucket = map.get(key);
      if (bucket) bucket.push(entry);
      else map.set(key, [entry]);
    }
    return map;
  }, [entries]);

  const monthLabel = new Intl.DateTimeFormat(LOCALE, {
    month: 'long',
    year: 'numeric',
    timeZone: OSLO_TZ,
  }).format(activeMonth);

  const weekDayLabels = React.useMemo(() => getWeekdayLabels(), []);

  const grid = React.useMemo(() => {
    return buildCalendarGrid(activeMonth);
  }, [activeMonth]);

  function handleMonthChange(next: Date) {
    if (!month) setInternalMonth(next);
    onMonthChange?.(next);
  }

  return (
    <section className={cn('cal-main w-full rounded-lg border border-border bg-background shadow-card', className)}>
      <header className="cal-toolbar flex flex-col gap-3 border-b border-border-soft px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="cal-toolbar-left flex flex-wrap items-center gap-2">
          <div className="cal-nav flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="cal-nav-btn size-8 rounded-[8px] text-text-muted"
              onClick={() => handleMonthChange(addMonthsUTC(activeMonth, -1))}
              aria-label="Forrige måned"
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cal-today-btn h-8 rounded-[8px] px-3 text-xs"
              onClick={() => handleMonthChange(startOfMonthUTC(new Date()))}
            >
              I dag
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="cal-nav-btn size-8 rounded-[8px] text-text-muted"
              onClick={() => handleMonthChange(addMonthsUTC(activeMonth, 1))}
              aria-label="Neste måned"
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
          <div className="cal-month font-display text-xl font-bold capitalize leading-none tracking-tight text-text-primary">
            {monthLabel}
          </div>
        </div>
        {(header || entries.length > 0) && (
          <div className="cal-toolbar-right flex items-center justify-between gap-2 md:justify-end">
            <div className="flex items-center gap-2 rounded-[8px] bg-surface px-2.5 py-1.5 text-xs font-semibold text-text-muted">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              {entries.length} {entries.length === 1 ? 'registrering' : 'registreringer'}
            </div>
            {header}
          </div>
        )}
      </header>

      <div className="cal-weekdays grid grid-cols-7 border-b border-border-soft bg-surface-variant-1 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-disabled">
        {weekDayLabels.map((label) => (
          <div key={label} className="px-2 py-2">
            {label}
          </div>
        ))}
      </div>

      <div className="cal-month grid grid-cols-7">
        {grid.map((cell) => {
          const key = toOsloDateKey(cell.date);
          const dayEntries = entriesByDate.get(key) ?? [];
          const visibleEntries = dayEntries.slice(0, MAX_VISIBLE_ENTRIES);
          const hiddenEntryCount = Math.max(dayEntries.length - visibleEntries.length, 0);
          const isToday = key === todayKey;
          const isOutside = cell.isOutside;

          if (!showOutsideDays && isOutside) {
            return <div key={cell.id} className="cal-day min-h-28 border-b border-r border-border-soft md:min-h-32" />;
          }

          return (
            <div
              key={cell.id}
              className={cn(
                'cal-day flex min-h-28 w-full flex-col gap-1 border-b border-r border-border-soft bg-background p-2 transition-colors',
                'hover:bg-surface md:min-h-32',
                isOutside && 'bg-surface-variant-1/50',
              )}
            >
              <div
                className={cn(
                  'cal-day-num flex size-6 items-center justify-center rounded-[6px] text-xs font-bold text-text-muted',
                  isToday && 'bg-interactive text-text-inverse',
                  isOutside && !isToday && 'text-text-disabled',
                )}
              >
                {cell.day}
              </div>
              <div className="mt-1 flex min-h-0 flex-1 flex-col gap-1 overflow-hidden text-xs text-text-primary">
                {visibleEntries.map((entry, index) => (
                  <div
                    key={entry.id ?? `${key}-${index}`}
                    className={cn(
                      'cal-event w-full truncate rounded-[6px] bg-blue-50 px-2 py-1 text-[11px] font-semibold leading-tight text-interactive',
                      entry.className,
                    )}
                  >
                    {entry.content}
                  </div>
                ))}
                {hiddenEntryCount > 0 ? (
                  <div className="cal-more rounded-[6px] px-2 py-1 text-[11px] font-semibold text-text-muted">
                    +{hiddenEntryCount} mer
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function buildCalendarGrid(monthStart: Date) {
  const firstOfMonth = startOfMonthUTC(monthStart);
  const start = startOfWeekMondayUTC(firstOfMonth);
  const cells: { id: string; date: Date; day: number; isOutside: boolean }[] = [];

  for (let i = 0; i < 42; i += 1) {
    const date = addDaysUTC(start, i);
    cells.push({
      id: date.toISOString(),
      date,
      day: date.getUTCDate(),
      isOutside: date.getUTCMonth() !== firstOfMonth.getUTCMonth(),
    });
  }

  return cells;
}

function startOfMonthUTC(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonthsUTC(date: Date, delta: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1));
}

function addDaysUTC(date: Date, delta: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + delta);
  return next;
}

function startOfWeekMondayUTC(date: Date) {
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDaysUTC(date, diff);
}

function getWeekdayLabels() {
  const formatter = new Intl.DateTimeFormat(LOCALE, {
    weekday: 'short',
    timeZone: OSLO_TZ,
  });
  const base = new Date(Date.UTC(2024, 0, 1));
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDaysUTC(base, index);
    return formatter.format(date);
  });
}

function toOsloDateKey(dateInput: string | Date) {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: OSLO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) return '';
  return `${year}-${month}-${day}`;
}
