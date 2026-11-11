import * as React from 'react';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { nb } from 'date-fns/locale';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { cn } from '../lib/cn';

type CalendarMode = 'single' | 'range';

export type CalendarDateRange = {
  from?: Date;
  to?: Date;
};

type DateMatcher =
  | Date
  | Date[]
  | {
      before?: Date;
      after?: Date;
    }
  | ((date: Date) => boolean);

type CalendarBaseProps = {
  className?: string;
  disabled?: DateMatcher;
  hidden?: DateMatcher;
  month?: Date;
  onMonthChange?: (month: Date) => void;
  numberOfMonths?: number;
  showOutsideDays?: boolean;
};

type CalendarSingleProps = CalendarBaseProps & {
  mode?: 'single';
  selected?: Date;
  onSelect?: (value: Date | undefined) => void;
};

type CalendarRangeProps = CalendarBaseProps & {
  mode: 'range';
  selected?: CalendarDateRange;
  onSelect?: (value: CalendarDateRange | undefined) => void;
};

export type CalendarProps = CalendarSingleProps | CalendarRangeProps;

function toStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isMatched(date: Date, matcher?: DateMatcher): boolean {
  if (!matcher) return false;
  if (typeof matcher === 'function') return matcher(date);
  if (matcher instanceof Date) return isSameDay(date, matcher);
  if (Array.isArray(matcher)) return matcher.some((d) => isSameDay(date, d));

  const normalized = toStartOfDay(date);
  if (matcher.before && isBefore(normalized, toStartOfDay(matcher.before))) return true;
  if (matcher.after && isAfter(normalized, toStartOfDay(matcher.after))) return true;
  return false;
}

function getMatcherBeforeDate(matcher?: DateMatcher): Date | null {
  if (!matcher) return null;
  if (typeof matcher === 'function') return null;
  if (matcher instanceof Date) return null;
  if (Array.isArray(matcher)) return null;
  return matcher.before ? toStartOfDay(matcher.before) : null;
}

function getRangeFromSelected(selected: Date | CalendarDateRange | undefined): CalendarDateRange | undefined {
  if (!selected) return undefined;
  if (selected instanceof Date) return { from: selected, to: selected };
  return selected;
}

function isRangeStart(date: Date, range?: CalendarDateRange) {
  return !!range?.from && isSameDay(date, range.from);
}

function isRangeEnd(date: Date, range?: CalendarDateRange) {
  return !!range?.to && isSameDay(date, range.to);
}

function isRangeMiddle(date: Date, range?: CalendarDateRange) {
  if (!range?.from || !range?.to) return false;
  if (isSameDay(range.from, range.to)) return false;
  return (
    isWithinInterval(date, { start: range.from, end: range.to }) &&
    !isRangeStart(date, range) &&
    !isRangeEnd(date, range)
  );
}

function dayButtonClassName({
  isToday,
  isDisabled,
  isOutside,
  isSelectedSingle,
  isStart,
  isEnd,
  isMiddle,
}: {
  isToday: boolean;
  isDisabled: boolean;
  isOutside: boolean;
  isSelectedSingle: boolean;
  isStart: boolean;
  isEnd: boolean;
  isMiddle: boolean;
}) {
  return cn(
    'h-9 w-9 rounded-sm text-sm font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive',
    isDisabled
      ? 'cursor-not-allowed text-text-disabled opacity-50'
      : 'cursor-pointer text-text-primary hover:bg-surface',
    isOutside && 'text-text-secondary/60',
    // Today is outlined, never filled: only chosen days are filled.
    isToday &&
      !isSelectedSingle &&
      !isStart &&
      !isEnd &&
      'font-semibold text-interactive ring-2 ring-inset ring-interactive',
    isMiddle && 'rounded-none bg-blue-50 text-text-primary hover:bg-blue-50',
    (isSelectedSingle || isStart || isEnd) && 'bg-interactive text-text-inverse hover:bg-interactive-hover',
    isStart && 'rounded-r-none',
    isEnd && 'rounded-l-none',
  );
}

function monthDays(month: Date) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

export function Calendar({
  className,
  mode = 'single',
  selected,
  onSelect,
  disabled,
  hidden,
  month,
  onMonthChange,
  numberOfMonths = 1,
  showOutsideDays = true,
}: CalendarProps) {
  const controlledMonth = month ? startOfMonth(month) : undefined;
  const minVisibleMonth = React.useMemo(() => {
    const beforeDate = getMatcherBeforeDate(hidden);
    return beforeDate ? startOfMonth(beforeDate) : null;
  }, [hidden]);
  const [internalMonth, setInternalMonth] = React.useState<Date>(controlledMonth ?? startOfMonth(new Date()));

  React.useEffect(() => {
    if (controlledMonth) {
      setInternalMonth(controlledMonth);
    }
  }, [controlledMonth]);

  React.useEffect(() => {
    if (!minVisibleMonth || controlledMonth) return;
    setInternalMonth((current) => (isBefore(current, minVisibleMonth) ? minVisibleMonth : current));
  }, [controlledMonth, minVisibleMonth]);

  const visibleMonth = controlledMonth ?? internalMonth;
  const months = Array.from({ length: Math.max(1, numberOfMonths) }, (_, i) => addMonths(visibleMonth, i));

  const range = getRangeFromSelected(selected);

  const setMonthAndNotify = (next: Date) => {
    const normalized = startOfMonth(next);
    const bounded = minVisibleMonth && isBefore(normalized, minVisibleMonth) ? minVisibleMonth : normalized;
    if (!controlledMonth) {
      setInternalMonth(bounded);
    }
    onMonthChange?.(bounded);
  };

  const canGoToPreviousMonth = !minVisibleMonth || !isSameMonth(visibleMonth, minVisibleMonth);

  const handleSelect = (day: Date) => {
    if (isMatched(day, disabled) || isMatched(day, hidden)) return;

    if (mode !== 'range') {
      const onSelectSingle = onSelect as CalendarSingleProps['onSelect'];
      onSelectSingle?.(day);
      return;
    }

    const onSelectRange = onSelect as CalendarRangeProps['onSelect'];
    const current = getRangeFromSelected(selected);

    if (!current?.from || (current.from && current.to)) {
      onSelectRange?.({ from: day, to: undefined });
      return;
    }

    if (isBefore(day, current.from)) {
      onSelectRange?.({ from: day, to: current.from });
      return;
    }

    onSelectRange?.({ from: current.from, to: day });
  };

  return (
    <div className={cn('w-fit rounded-md bg-background p-3', className)}>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonthAndNotify(subMonths(visibleMonth, 1))}
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-sm text-text-primary hover:bg-surface',
            !canGoToPreviousMonth && 'cursor-not-allowed opacity-40 hover:bg-transparent',
          )}
          aria-label="Forrige måned"
          disabled={!canGoToPreviousMonth}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <div className="text-sm font-semibold text-text-primary">
          {format(visibleMonth, 'LLLL yyyy', { locale: nb })}
        </div>
        <button
          type="button"
          onClick={() => setMonthAndNotify(addMonths(visibleMonth, 1))}
          className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-text-primary hover:bg-surface"
          aria-label="Neste måned"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>

      <div className={cn('grid gap-4', months.length > 1 && 'md:grid-cols-2')}>
        {months.map((monthDate) => (
          <div key={monthDate.toISOString()} className="w-full">
            {months.length > 1 ? (
              <div className="mb-2 text-center text-sm font-medium text-text-primary">
                {format(monthDate, 'LLLL yyyy', { locale: nb })}
              </div>
            ) : null}

            <div className="grid grid-cols-7 gap-1">
              {['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'].map((weekday) => (
                <div key={weekday} className="h-8 text-center text-xs font-medium text-text-secondary">
                  {weekday}
                </div>
              ))}

              {monthDays(monthDate)
                .flat()
                .map((day) => {
                  const outside = !isSameMonth(day, monthDate);
                  const isHidden = isMatched(day, hidden);
                  const isDisabled = isMatched(day, disabled);
                  const start = isRangeStart(day, range);
                  const end = isRangeEnd(day, range);
                  const middle = isRangeMiddle(day, range);
                  const selectedSingle = mode === 'single' && selected instanceof Date && isSameDay(day, selected);

                  if (isHidden || (!showOutsideDays && outside)) {
                    return <div key={day.toISOString()} className="h-9 w-9" aria-hidden="true" />;
                  }

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleSelect(day)}
                      className={dayButtonClassName({
                        isToday: isSameDay(day, new Date()),
                        isDisabled,
                        isOutside: outside,
                        isSelectedSingle: selectedSingle,
                        isStart: start,
                        isEnd: end,
                        isMiddle: middle,
                      })}
                      aria-pressed={selectedSingle || start || end || middle}
                      aria-label={format(day, 'eeee d. MMMM yyyy', { locale: nb })}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CalendarDayButton() {
  return null;
}
