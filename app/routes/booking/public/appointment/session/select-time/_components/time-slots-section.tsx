import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Clock } from 'lucide-react';
import type { ScheduleDto } from '~/api/generated';
import { formatFullDate } from '~/lib/date.utils';
import { cn, Panel as BookingSection } from '~/ui';
import { groupTimeSlotsByHour, isSameSlotTime } from '../_utils/select-time-schedule';
import { TimeSlotButton } from './time-slot-button';

type TimeSlotsSectionProps = {
  selectedDate: string | null;
  timeSlots: ScheduleDto['timeSlots'];
  displayTime: string | null;
  isSubmitting: boolean;
  variant?: 'mobile' | 'desktop';
  /** Picks a time without submitting a form (Ny time on the company side). */
  onSelectTime?: (time: string) => void;
};

export function TimeSlotsSection({
  selectedDate,
  timeSlots,
  displayTime,
  isSubmitting,
  variant = 'mobile',
  onSelectTime,
}: TimeSlotsSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showMoreTimeHint, setShowMoreTimeHint] = useState(true);
  const groupedTimeSlots = useMemo(() => groupTimeSlotsByHour(timeSlots), [timeSlots]);
  const groupedHours = useMemo(
    () => Object.keys(groupedTimeSlots).sort((a, b) => Number(a.split(':')[0]) - Number(b.split(':')[0])),
    [groupedTimeSlots],
  );

  useEffect(() => {
    if (variant !== 'mobile') {
      return;
    }

    const target = scrollRef.current;
    if (!target) return;

    const updateHintVisibility = () => {
      const atEnd = target.scrollLeft + target.clientWidth >= target.scrollWidth - 4;
      setShowMoreTimeHint(!atEnd);
    };

    updateHintVisibility();
    target.addEventListener('scroll', updateHintVisibility, { passive: true });
    window.addEventListener('resize', updateHintVisibility);

    return () => {
      target.removeEventListener('scroll', updateHintVisibility);
      window.removeEventListener('resize', updateHintVisibility);
    };
  }, [groupedHours, variant]);

  if (variant === 'desktop') {
    return (
      <BookingSection className="lg:col-span-3">
        {!selectedDate ? (
          <div className="flex flex-col items-center justify-center gap-2 py-6">
            <Clock className="size-12 text-booking-text-muted opacity-50" />
            <p className="text-sm font-medium text-booking-text">Velg en dato først</p>
            <p className="max-w-xs text-center text-xs text-booking-text-muted">
              Velg en dato fra listen til venstre for å se ledige tider
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between gap-3 border-b border-booking-border pb-2">
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-booking-text-muted" />
                <div>
                  <h3 className="text-base font-bold text-booking-text">Velg tid</h3>
                  <p className="text-sm text-booking-text-muted">{formatFullDate(selectedDate)}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2">
              {groupedHours.map((hour) => (
                <HourColumn
                  key={hour}
                  hour={hour}
                  slots={groupedTimeSlots[hour]}
                  displayTime={displayTime}
                  isSubmitting={isSubmitting}
                  onSelectTime={onSelectTime}
                  className="min-w-44"
                />
              ))}
            </div>
          </>
        )}
      </BookingSection>
    );
  }

  if (!selectedDate || timeSlots.length === 0) {
    return null;
  }

  return (
    <BookingSection>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-booking-text-muted" />
            <h3 className="text-sm font-bold text-booking-text">Velg tid</h3>
          </div>
          <p className="text-xs text-booking-text-muted">{formatFullDate(selectedDate)}</p>
        </div>

        <div className="relative">
          {showMoreTimeHint && (
            <div
              className={cn(
                'pointer-events-none absolute inset-y-0 right-0 z-10 flex w-8 items-center justify-center',
                'bg-gradient-to-l from-booking-surface-raised/100 to-transparent font-semibold uppercase tracking-wider',
              )}
              aria-hidden="true"
            >
              <ChevronRight className="size-4 text-booking-action-text animate-bounce-right" />
            </div>
          )}
          <div ref={scrollRef} className="overflow-x-auto pb-2 pr-8">
            <div className="flex gap-3">
              {groupedHours.map((hour) => (
                <HourColumn
                  key={hour}
                  hour={hour}
                  slots={groupedTimeSlots[hour]}
                  displayTime={displayTime}
                  isSubmitting={isSubmitting}
                  onSelectTime={onSelectTime}
                  className="min-w-40"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </BookingSection>
  );
}

type HourColumnProps = {
  hour: string;
  slots: ScheduleDto['timeSlots'];
  displayTime: string | null;
  isSubmitting: boolean;
  onSelectTime?: (time: string) => void;
  className?: string;
};

function HourColumn({ hour, slots, displayTime, isSubmitting, onSelectTime, className }: HourColumnProps) {
  return (
    <div className={cn('shrink-0', className)}>
      <div className="mb-1 px-1 text-xs font-semibold uppercase tracking-wider text-booking-text-muted">{hour}</div>
      <div className="grid grid-cols-2 gap-2 p-1">
        {slots.map((slot) => (
          <TimeSlotButton
            key={slot.startTime}
            time={slot.startTime}
            isSelected={displayTime ? isSameSlotTime(displayTime, slot.startTime) : false}
            disabled={isSubmitting}
            variant="compact"
            onSelect={onSelectTime}
          />
        ))}
      </div>
    </div>
  );
}
