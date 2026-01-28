import * as React from 'react';

import { cn } from '~/lib/utils';

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
    <section className={cn('w-full rounded-lg border border-border bg-background p-4', className)}>
      <header className="mb-4 flex items-center justify-between">
        <div className="text-lg font-semibold capitalize text-foreground">{monthLabel}</div>
        <div className="flex items-center gap-2">
          {header}
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
            onClick={() => handleMonthChange(addMonthsUTC(activeMonth, -1))}
            aria-label="Previous month"
          >
            Forrige
          </button>
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
            onClick={() => handleMonthChange(addMonthsUTC(activeMonth, 1))}
            aria-label="Next month"
          >
            Neste
          </button>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {weekDayLabels.map((label) => (
          <div key={label} className="px-1">
            {label}
          </div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-2">
        {grid.map((cell) => {
          const key = toOsloDateKey(cell.date);
          const dayEntries = entriesByDate.get(key) ?? [];
          const isToday = key === todayKey;
          const isOutside = cell.isOutside;

          if (!showOutsideDays && isOutside) {
            return <div key={cell.id} className="h-28 md:h-32" />;
          }

          return (
            <div
              key={cell.id}
              className={cn(
                'flex h-28 w-full flex-col gap-1 border border-border bg-background p-2',
                'md:h-32',
                isOutside && 'opacity-50',
              )}
            >
              <div className={cn('text-xs font-semibold text-foreground/80', isToday && 'text-primary')}>
                {cell.day}
              </div>
              <div className="h-[72px] overflow-y-auto pr-1 text-xs text-foreground/80 md:h-[88px]">
                {dayEntries.map((entry, index) => (
                  <div
                    key={entry.id ?? `${key}-${index}`}
                    className={cn('w-full truncate rounded-sm px-1.5 py-1 mt-2', entry.className ?? 'bg-muted')}
                  >
                    {entry.content}
                  </div>
                ))}
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
