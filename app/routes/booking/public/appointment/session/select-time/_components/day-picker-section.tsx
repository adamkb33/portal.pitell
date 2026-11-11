import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import type { ScheduleDto } from '~/api/generated';
import { Calendar, cn, Panel as BookingSection, Popover, PopoverContent, PopoverTrigger } from '~/ui';
import { buildBookingDays, findNextAvailableDay } from '../_utils/select-time-schedule';

type DayPickerSectionProps = {
  schedules: ScheduleDto[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
};

/** One swipeable row of days (like Fresha); the calendar icon jumps further ahead. */
export function DayPickerSection({ schedules, selectedDate, onSelectDate }: DayPickerSectionProps) {
  const days = useMemo(() => buildBookingDays(schedules), [schedules]);
  const stripRef = useRef<HTMLDivElement>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date | undefined>(undefined);
  const selectedDay = days.find((day) => day.key === selectedDate) ?? null;
  const nextAvailableDay = selectedDay && !selectedDay.isAvailable ? findNextAvailableDay(days, selectedDay.key) : null;

  // Keep the chosen day at the start of the row without scrolling the page.
  useEffect(() => {
    const strip = stripRef.current;
    const button = strip?.querySelector<HTMLElement>(`[data-date="${selectedDate}"]`);
    if (!strip || !button) return;
    strip.scrollTo({ left: Math.max(0, button.offsetLeft - 4), behavior: 'smooth' });
  }, [selectedDate]);

  if (days.length === 0) {
    return (
      <BookingSection>
        <p className="text-center text-sm text-booking-text-muted">Ingen ledige tider akkurat nå.</p>
      </BookingSection>
    );
  }

  return (
    <BookingSection>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-booking-text">Velg dag</h3>
          <Popover
            open={calendarOpen}
            onOpenChange={(open) => {
              setCalendarOpen(open);
              if (open) setCalendarMonth(selectedDay?.date ?? days[0].date);
            }}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Velg dag fra kalender"
                className="grid size-11 place-items-center rounded-full border-[length:var(--border-booking-card)] border-booking-border text-booking-text transition-colors hover:bg-booking-action-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-booking-action-text"
              >
                <CalendarDays className="size-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto overflow-hidden border-border bg-background p-0">
              <Calendar
                mode="single"
                selected={selectedDay?.date}
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                disabled={(date: Date) =>
                  !days.some((day) => day.isAvailable && day.key === format(date, 'yyyy-MM-dd'))
                }
                onSelect={(date) => {
                  if (!(date instanceof Date)) return;
                  onSelectDate(format(date, 'yyyy-MM-dd'));
                  setCalendarOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div
          ref={stripRef}
          role="group"
          aria-label="Dager"
          className="relative -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
        >
          {days.map((day) => {
            const isSelected = day.key === selectedDate;
            return (
              <button
                key={day.key}
                type="button"
                data-date={day.key}
                aria-pressed={isSelected}
                aria-label={`${format(day.date, 'EEEE d. MMMM', { locale: nb })}${day.isAvailable ? '' : ', fullbooket'}`}
                onClick={() => onSelectDate(day.key)}
                className={cn(
                  'flex w-14 shrink-0 snap-start flex-col items-center rounded-[var(--radius-booking-control)] border-[length:var(--border-booking-card)] py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-booking-action-text',
                  isSelected
                    ? 'border-booking-action bg-booking-action text-booking-action-contrast'
                    : day.isAvailable
                      ? 'border-booking-border bg-booking-surface-raised text-booking-text hover:border-booking-action/50'
                      : 'border-booking-border bg-transparent text-booking-text-muted opacity-60',
                )}
              >
                <span className="text-xs">{format(day.date, 'EEE', { locale: nb }).replace('.', '')}</span>
                <span className="text-lg font-semibold leading-tight">{format(day.date, 'd')}</span>
                <span className="text-xs">{format(day.date, 'MMM', { locale: nb }).replace('.', '')}</span>
              </button>
            );
          })}
        </div>

        {selectedDay && !selectedDay.isAvailable ? (
          <div className="rounded-[var(--radius-booking-control)] border-[length:var(--border-booking-card)] border-booking-border bg-booking-surface-raised p-4 text-center">
            <p className="font-semibold text-booking-text">Fullbooket denne dagen</p>
            {nextAvailableDay ? (
              <>
                <p className="mt-1 text-sm text-booking-text-muted">
                  Neste ledige: {format(nextAvailableDay.date, 'EEEE d. MMMM', { locale: nb })}
                </p>
                <button
                  type="button"
                  onClick={() => onSelectDate(nextAvailableDay.key)}
                  className="mt-3 min-h-11 rounded-full border-[length:var(--border-booking-card)] border-booking-border px-4 text-sm font-semibold text-booking-text transition-colors hover:bg-booking-action-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-booking-action-text"
                >
                  Gå til neste ledige dag
                </button>
              </>
            ) : (
              <p className="mt-1 text-sm text-booking-text-muted">Ingen ledige dager etter denne.</p>
            )}
          </div>
        ) : null}
      </div>
    </BookingSection>
  );
}
