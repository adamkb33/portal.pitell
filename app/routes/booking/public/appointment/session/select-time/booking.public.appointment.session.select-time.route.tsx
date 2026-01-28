import { useSearchParams, useSubmit, useNavigation, Link } from 'react-router';
import type { Route } from './+types/booking.public.appointment.session.select-time.route';
import { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, Zap, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScheduleDto } from '~/api/generated/booking';
import { ROUTES_MAP } from '~/lib/route-tree';
import { formatCompactDate, formatFullDate, formatTime } from '~/lib/date.utils';
import { appointmentSessionSelectTimeAction } from './_features/appointment.session.select-time.loader';
import { appointmentSessionSelectTimeLoader } from './_features/appointment.session.select-time.action';
import { BookingContainer, BookingStepHeader, BookingButton, BookingSummary, BookingSection } from '../../_components/booking-layout';

export const loader = appointmentSessionSelectTimeLoader;
export const action = appointmentSessionSelectTimeAction;

/* ========================================
   UTILITY FUNCTIONS
   ======================================== */

function groupSchedulesByWeek(schedules: ScheduleDto[]) {
  const weeks = new Map<
    string,
    {
      weekNumber: number;
      year: number;
      schedules: ScheduleDto[];
      startDate: Date;
    }
  >();

  schedules.forEach((schedule) => {
    const date = new Date(schedule.date);
    const weekNumber = getWeekNumber(date);
    const year = date.getFullYear();
    const weekKey = `${year}-W${weekNumber}`;

    if (!weeks.has(weekKey)) {
      const startOfWeek = getStartOfWeek(date);
      weeks.set(weekKey, { weekNumber, year, schedules: [], startDate: startOfWeek });
    }
    weeks.get(weekKey)!.schedules.push(schedule);
  });

  return Array.from(weeks.entries())
    .map(([key, data]) => ({ key, ...data }))
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function parseDateTime(value: string): number | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

function isSameSlotTime(a: string, b: string): boolean {
  const aTime = parseDateTime(a);
  const bTime = parseDateTime(b);
  if (aTime !== null && bTime !== null) {
    return aTime === bTime;
  }
  return a === b;
}

function findScheduleWithTime(schedules: ScheduleDto[], startTime: string): string | null {
  for (const schedule of schedules) {
    if (schedule.timeSlots.some((slot) => isSameSlotTime(slot.startTime, startTime))) {
      return schedule.date;
    }
  }
  return null;
}

function getWeekLabel(weekData: { weekNumber: number; year: number; startDate: Date }): string {
  const today = new Date();
  const currentWeek = getWeekNumber(today);
  const currentYear = today.getFullYear();

  if (weekData.year === currentYear) {
    if (weekData.weekNumber === currentWeek) return 'Denne uken';
    if (weekData.weekNumber === currentWeek + 1) return 'Neste uke';
  }

  const monthNames = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
  const month = monthNames[weekData.startDate.getMonth()];
  const day = weekData.startDate.getDate();

  return `Uke ${weekData.weekNumber} (${day}. ${month})`;
}

function getEarliestSlot(schedules: ScheduleDto[]): { date: string; time: string } | null {
  if (schedules.length === 0) return null;

  const firstSchedule = schedules[0];
  const firstSlot = firstSchedule.timeSlots[0];

  return firstSlot ? { date: firstSchedule.date, time: firstSlot.startTime } : null;
}

/* ========================================
   DATE BUTTON COMPONENT
   ======================================== */

interface DateButtonProps {
  schedule: ScheduleDto;
  isSelected: boolean;
  hasSelectedTime: boolean;
  onClick: () => void;
  variant?: 'default' | 'compact';
}

function DateButton({ schedule, isSelected, hasSelectedTime, onClick, variant = 'default' }: DateButtonProps) {
  const { day, date, month } = formatCompactDate(schedule.date);
  const isCompact = variant === 'compact';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        // Base styles - mobile-first touch target
        'relative flex w-full items-center justify-between gap-3 rounded-lg border-2 transition-all',
        isCompact ? 'min-h-11 px-3 py-2' : 'min-h-16 p-3 md:min-h-14',

        // Selected state
        isSelected && ['border-primary bg-primary text-primary-foreground', 'shadow-sm'],

        // Default state
        !isSelected && ['border-card-border bg-card text-card-text', 'hover:border-primary/50 hover:bg-card-hover-bg'],
      )}
    >
      {/* Date info */}
      <div className="flex items-center gap-3">
        {/* Day/Date */}
        <div className="flex flex-col items-start">
          <span
            className={cn(
              'text-xs font-semibold uppercase tracking-wider',
              isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground',
            )}
          >
            {day}
          </span>
          <span className={cn('font-bold', isCompact ? 'text-sm' : 'text-base md:text-lg')}>
            {date}. {month}
          </span>
        </div>

        {/* Selected indicator */}
        {hasSelectedTime && (
          <div
            className={cn(
              'flex size-6 items-center justify-center rounded-full',
              isSelected ? 'bg-primary-foreground' : 'bg-primary',
            )}
          >
            <Check className={cn('size-4', isSelected ? 'text-primary' : 'text-primary-foreground')} strokeWidth={3} />
          </div>
        )}
      </div>

      {/* Slot count badge */}
      <div
        className={cn(
          'flex flex-col items-end gap-0.5 rounded-lg px-2.5 py-1',
          isSelected ? 'bg-primary-foreground/20' : 'bg-muted',
        )}
      >
        <span
          className={cn(
            'font-bold',
            isCompact ? 'text-sm' : 'text-base',
            isSelected ? 'text-primary-foreground' : 'text-card-text',
          )}
        >
          {schedule.timeSlots.length}
        </span>
        <span className={cn('text-xs', isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
          ledig
        </span>
      </div>
    </button>
  );
}

/* ========================================
   TIME SLOT BUTTON
   ======================================== */

interface TimeSlotButtonProps {
  time: string;
  isSelected: boolean;
  onClick: () => void;
  variant?: 'default' | 'compact';
}

function TimeSlotButton({ time, isSelected, onClick, variant = 'default' }: TimeSlotButtonProps) {
  const isCompact = variant === 'compact';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        // Touch-friendly: 48px height on mobile
        'flex items-center justify-center rounded-lg border-2 font-bold transition-all',
        isCompact ? 'min-h-10 px-3 py-2 text-xs' : 'min-h-12 px-4 py-3 text-sm md:min-h-11 md:text-base',

        // Selected state
        isSelected && [
          'border-primary bg-primary text-primary-foreground',
          'shadow-sm ring-2 ring-primary/20 ring-offset-2',
        ],

        // Default state
        !isSelected && [
          'border-card-border bg-card text-card-text',
          'hover:border-primary/50 hover:bg-card-hover-bg',
          'active:scale-95',
        ],
      )}
    >
      <span>{formatTime(time)}</span>
    </button>
  );
}

function groupTimeSlotsByHour(timeSlots: ScheduleDto['timeSlots']) {
  return timeSlots.reduce<Record<string, ScheduleDto['timeSlots']>>((groups, slot) => {
    const hourLabel = formatTime(slot.startTime).split(':')[0] + ':00';
    if (!groups[hourLabel]) {
      groups[hourLabel] = [];
    }
    groups[hourLabel].push(slot);
    return groups;
  }, {});
}

/* ========================================
   MAIN COMPONENT
   ======================================== */

export default function BookingPublicAppointmentSessionSelectTimeRoute({ loaderData }: Route.ComponentProps) {
  const schedules = loaderData.schedules ?? [];
  const session = loaderData.session;
  const [searchParams, setSearchParams] = useSearchParams();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  if (loaderData.error || !session) {
    return (
      <BookingContainer>
        <BookingStepHeader title="Velg tidspunkt" description={loaderData.error ?? 'Ugyldig økt'} />
      </BookingContainer>
    );
  }

  const weekGroups = useMemo(() => groupSchedulesByWeek(schedules), [schedules]);
  const earliestSlot = useMemo(() => getEarliestSlot(schedules), [schedules]);

  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isDateListCollapsed, setIsDateListCollapsed] = useState(false);
  const mobileTimeSlotsRef = useRef<HTMLDivElement>(null);
  const mobileTimeSlotsScrollRef = useRef<HTMLDivElement>(null);
  const weekTabsRef = useRef<HTMLDivElement>(null);
  const activeWeekRef = useRef<HTMLButtonElement>(null);
  const [showMoreTimeHint, setShowMoreTimeHint] = useState(true);

  const urlSelectedTime = searchParams.get('time');
  const persistedTime = urlSelectedTime || session.selectedStartTime;
  const displayTime = selectedTime || persistedTime;

  const currentWeek = weekGroups[selectedWeekIndex];
  const currentWeekSchedules = currentWeek?.schedules || [];
  const selectedSchedule = currentWeekSchedules.find((s) => s.date === selectedDate);
  const visibleSchedules =
    isDateListCollapsed && selectedDate
      ? currentWeekSchedules.filter((schedule) => schedule.date === selectedDate)
      : currentWeekSchedules;

  // Initialize: find week with selected time or default to first week
  useEffect(() => {
    if (session.selectedStartTime && !urlSelectedTime) {
      setSearchParams({ time: session.selectedStartTime }, { replace: true });
    }

    if (persistedTime && weekGroups.length > 0) {
      const scheduleDate = findScheduleWithTime(schedules, persistedTime);
      if (scheduleDate) {
        const weekIndex = weekGroups.findIndex((wg) => wg.schedules.some((s) => s.date === scheduleDate));
        if (weekIndex !== -1) {
          setSelectedWeekIndex(weekIndex);
          setSelectedDate(scheduleDate);
          setIsDateListCollapsed(true);
        }
      }
    }
  }, [session.selectedStartTime, urlSelectedTime, persistedTime, schedules, weekGroups, setSearchParams]);

  useEffect(() => {
    if (!selectedSchedule || !mobileTimeSlotsRef.current) return;
    mobileTimeSlotsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selectedSchedule]);

  useEffect(() => {
    if (!activeWeekRef.current) return;
    activeWeekRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedWeekIndex]);

  const handleTimeSelect = (startTime: string) => {
    setSelectedTime(startTime);
  };

  const handleQuickBook = () => {
    if (earliestSlot) {
      setSelectedTime(earliestSlot.time);
      const scheduleDate = findScheduleWithTime(schedules, earliestSlot.time);
      if (scheduleDate) {
        const weekIndex = weekGroups.findIndex((wg) => wg.schedules.some((s) => s.date === scheduleDate));
        if (weekIndex !== -1) {
          setSelectedWeekIndex(weekIndex);
          setSelectedDate(scheduleDate);
          setIsDateListCollapsed(true);
        }
      }
    }
  };

  const getOsloDateParts = (date: Date) => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Oslo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return {
      year: Number(map.year),
      month: Number(map.month),
      day: Number(map.day),
      hour: Number(map.hour),
      minute: Number(map.minute),
      second: Number(map.second),
    };
  };

  const getOsloOffsetMinutes = (date: Date) => {
    const osloParts = getOsloDateParts(date);
    const osloAsUtc = Date.UTC(
      osloParts.year,
      osloParts.month - 1,
      osloParts.day,
      osloParts.hour,
      osloParts.minute,
      osloParts.second,
    );
    return (osloAsUtc - date.getTime()) / 60000;
  };

  const formatOffset = (minutes: number) => {
    const sign = minutes >= 0 ? '+' : '-';
    const abs = Math.abs(minutes);
    const hours = String(Math.floor(abs / 60)).padStart(2, '0');
    const mins = String(abs % 60).padStart(2, '0');
    return `${sign}${hours}:${mins}`;
  };

  const normalizeToOsloIso = (value: string): string => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;

    const osloParts = getOsloDateParts(parsed);
    const offset = formatOffset(getOsloOffsetMinutes(parsed));
    return `${osloParts.year}-${String(osloParts.month).padStart(2, '0')}-${String(osloParts.day).padStart(
      2,
      '0',
    )}T${String(osloParts.hour).padStart(2, '0')}:${String(osloParts.minute).padStart(2, '0')}:${String(
      osloParts.second,
    ).padStart(2, '0')}${offset}`;
  };

  const handleSubmit = () => {
    if (selectedTime) {
      const scheduleDate = selectedDate ?? findScheduleWithTime(schedules, selectedTime);
      const rawDateTime = selectedTime.includes('T')
        ? selectedTime
        : scheduleDate
          ? `${scheduleDate}T${selectedTime}`
          : selectedTime;
      const selectedStartTimeOslo = normalizeToOsloIso(rawDateTime);
      const formData = new FormData();
      formData.set('selectedStartTime', selectedStartTimeOslo);
      submit(formData, { method: 'post' });
    } else {
      submit(null, {
        method: 'get',
        action: ROUTES_MAP['booking.public.appointment.session.overview'].href,
      });
    }
  };

  const handlePrevWeek = () => {
    if (selectedWeekIndex > 0) {
      setSelectedWeekIndex(selectedWeekIndex - 1);
      setSelectedDate(null);
      setIsDateListCollapsed(false);
    }
  };

  const handleNextWeek = () => {
    if (selectedWeekIndex < weekGroups.length - 1) {
      setSelectedWeekIndex(selectedWeekIndex + 1);
      setSelectedDate(null);
      setIsDateListCollapsed(false);
    }
  };

  const totalSlots = currentWeekSchedules.reduce((sum, s) => sum + s.timeSlots.length, 0);
  const timeSlots = selectedSchedule?.timeSlots ?? [];
  const groupedTimeSlots = useMemo(() => groupTimeSlotsByHour(timeSlots), [timeSlots]);
  const groupedHours = useMemo(
    () => Object.keys(groupedTimeSlots).sort((a, b) => Number(a.split(':')[0]) - Number(b.split(':')[0])),
    [groupedTimeSlots],
  );

  useEffect(() => {
    const target = mobileTimeSlotsScrollRef.current;
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
  }, [groupedHours]);

  return (
    <>
      <BookingContainer>
        {/* ========================================
            PAGE HEADER
            ======================================== */}
        <BookingStepHeader
          label="Velg tidspunkt"
          title="Hva er ett tidspunkt du ønsker?"
          description={displayTime ? 'Valgt tidspunkt kan endres' : 'Velg dato og klokkeslett for avtalen'}
        />

        {/* ========================================
            QUICK BOOK - First available slot
            ======================================== */}
        {earliestSlot && !displayTime && (
          <BookingSection>
            <button
              type="button"
              onClick={handleQuickBook}
              className="flex w-full items-center justify-between gap-3 rounded-lg border-2 border-dashed border-primary/50 bg-primary/5 p-4 transition-colors hover:border-primary hover:bg-primary/10"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary">
                  <Zap className="size-5 text-primary-foreground" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-card-text md:text-base">Raskeste tiden</p>
                  <p className="text-xs text-muted-foreground md:text-sm">
                    {formatFullDate(earliestSlot.date)} kl. {formatTime(earliestSlot.time)}
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium text-primary">Velg →</span>
            </button>
          </BookingSection>
        )}

        {/* ========================================
            WEEK NAVIGATOR
            ======================================== */}
        {weekGroups.length > 1 && (
          <BookingSection className="p-0">
            {/* Navigation controls */}
            <div className="flex items-center border-b border-card-border">
              <button
                type="button"
                onClick={handlePrevWeek}
                disabled={selectedWeekIndex === 0}
                className="flex size-12 items-center justify-center border-r border-card-border transition-colors hover:bg-card-hover-bg disabled:cursor-not-allowed disabled:opacity-30 md:size-14"
                aria-label="Forrige uke"
              >
                <ChevronLeft className="size-5 md:size-6" />
              </button>

              <div className="flex-1 py-3 text-center">
                <p className="text-sm font-bold text-card-text md:text-base">{getWeekLabel(currentWeek)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{totalSlots} ledige tider</p>
              </div>

              <button
                type="button"
                onClick={handleNextWeek}
                disabled={selectedWeekIndex === weekGroups.length - 1}
                className="flex size-12 items-center justify-center border-l border-card-border transition-colors hover:bg-card-hover-bg disabled:cursor-not-allowed disabled:opacity-30 md:size-14"
                aria-label="Neste uke"
              >
                <ChevronRight className="size-5 md:size-6" />
              </button>
            </div>

            {/* Week indicator - Touch-friendly tabs */}
            {weekGroups.length > 1 && (
              <div ref={weekTabsRef} className="flex gap-1 overflow-x-auto p-2 md:overflow-visible">
                {weekGroups.map((week, index) => {
                  const weekLabel = getWeekLabel(week);
                  const isActive = index === selectedWeekIndex;

                  return (
                    <button
                      key={week.key}
                      ref={isActive ? activeWeekRef : null}
                      type="button"
                      onClick={() => {
                        setSelectedWeekIndex(index);
                        setSelectedDate(null);
                        setIsDateListCollapsed(false);
                      }}
                      className={cn(
                        // Touch-friendly: 44px height
                        'min-h-11 shrink-0 rounded px-3 py-2 text-xs font-semibold transition-all md:text-sm md:flex-1',
                        'min-w-[140px] md:min-w-0',
                        isActive && 'bg-primary text-primary-foreground shadow-sm',
                        !isActive && 'bg-muted text-muted-foreground hover:bg-muted/70',
                      )}
                      aria-label={`Gå til ${weekLabel}`}
                      aria-current={isActive ? 'true' : undefined}
                    >
                      <span className="block truncate">{weekLabel}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </BookingSection>
        )}

        {/* ========================================
            MOBILE: STACKED LAYOUT
            ======================================== */}
        <div className="space-y-4 md:hidden">
          {/* Date selector */}
          <BookingSection>
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-bold text-card-text">Velg dato</h3>
              {selectedDate && isDateListCollapsed && (
                <button
                  type="button"
                  onClick={() => setIsDateListCollapsed(false)}
                  className="ml-auto rounded-md border border-primary px-2.5 py-1 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                  Endre dato
                </button>
              )}
            </div>

            {currentWeekSchedules.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-card-border bg-card-accent/5 p-6 text-center">
                <p className="text-sm text-muted-foreground">Ingen ledige datoer denne uken</p>
              </div>
            ) : (
              <div className="space-y-2">
                {visibleSchedules.map((schedule) => (
                  <DateButton
                    key={schedule.date}
                    schedule={schedule}
                    isSelected={selectedDate === schedule.date}
                    hasSelectedTime={schedule.timeSlots.some((slot) => slot.startTime === displayTime)}
                    onClick={() => {
                      setSelectedDate(schedule.date);
                      setIsDateListCollapsed(true);
                    }}
                  />
                ))}
              </div>
            )}
          </BookingSection>

          {/* Time slots */}
          {selectedSchedule && (
            <BookingSection>
              <div ref={mobileTimeSlotsRef} className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-muted-foreground" />
                    <h3 className="text-sm font-bold text-card-text">Velg tid</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatFullDate(selectedDate!)}</p>
                </div>

                <div className="relative">
                  {showMoreTimeHint && (
                    <div
                      className={cn(
                        'pointer-events-none absolute inset-y-0 right-0 z-10 flex w-8 items-center justify-center',
                        'bg-gradient-to-l from-background/100 to-transparent font-semibold uppercase tracking-wider',
                      )}
                      aria-hidden="true"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <ChevronRight className="size-4 text-primary animate-bounce-right" />
                      </div>
                    </div>
                  )}
                  <div ref={mobileTimeSlotsScrollRef} className="overflow-x-auto pb-2 pr-8">
                    <div className="flex gap-3">
                      {groupedHours.map((hour) => (
                        <div key={hour} className="min-w-[160px] shrink-0">
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {hour}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {groupedTimeSlots[hour].map((slot) => (
                              <TimeSlotButton
                                key={slot.startTime}
                                time={slot.startTime}
                                isSelected={displayTime === slot.startTime}
                                onClick={() => handleTimeSelect(slot.startTime)}
                                variant="compact"
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </BookingSection>
          )}
        </div>

        {/* ========================================
            DESKTOP: SIDE-BY-SIDE LAYOUT
            ======================================== */}
        <div className="hidden md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-5">
          {/* Date selector */}
          <BookingSection className="lg:col-span-2">
            <div className="mb-2 flex items-center gap-2">
              <Calendar className="size-5 text-muted-foreground" />
              <h3 className="text-base font-bold text-card-text">Velg dato</h3>
              {selectedDate && isDateListCollapsed && (
                <button
                  type="button"
                  onClick={() => setIsDateListCollapsed(false)}
                  className="ml-auto rounded-md border border-primary px-2.5 py-1 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                  Endre dato
                </button>
              )}
            </div>

            {currentWeekSchedules.length === 0 ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-lg border-2 border-dashed border-card-border bg-card-accent/5 p-6 text-center">
                <p className="text-sm text-muted-foreground">Ingen ledige datoer denne uken</p>
              </div>
            ) : (
              <div className="space-y-2">
                {visibleSchedules.map((schedule) => (
                  <DateButton
                    key={schedule.date}
                    schedule={schedule}
                    isSelected={selectedDate === schedule.date}
                    hasSelectedTime={schedule.timeSlots.some((slot) => slot.startTime === displayTime)}
                    onClick={() => {
                      setSelectedDate(schedule.date);
                      setIsDateListCollapsed(true);
                    }}
                    variant="compact"
                  />
                ))}
              </div>
            )}
          </BookingSection>

          {/* Time slots */}
          <BookingSection className="lg:col-span-3">
            {!selectedDate ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center gap-3">
                <Clock className="size-12 text-muted-foreground opacity-50" />
                <p className="text-sm font-medium text-card-text">Velg en dato først</p>
                <p className="max-w-xs text-center text-xs text-muted-foreground">
                  Velg en dato fra listen til venstre for å se ledige tider
                </p>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between gap-3 border-b border-card-border pb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="size-5 text-muted-foreground" />
                    <div>
                      <h3 className="text-base font-bold text-card-text">Ledige tider</h3>
                      <p className="text-sm text-muted-foreground">{formatFullDate(selectedDate)}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {groupedHours.map((hour) => (
                      <div key={hour} className="min-w-[180px] shrink-0">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {hour}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {groupedTimeSlots[hour].map((slot) => (
                            <TimeSlotButton
                              key={slot.startTime}
                              time={slot.startTime}
                              isSelected={displayTime === slot.startTime}
                              onClick={() => handleTimeSelect(slot.startTime)}
                              variant="compact"
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </BookingSection>
        </div>
      </BookingContainer>

      {displayTime && (
        <BookingSummary
          mobile={{
            title: 'Oppsummering',
            items: [
              { label: 'Dato', value: formatFullDate(displayTime) },
              { label: 'Tid', value: `kl. ${formatTime(displayTime)}` },
            ],
            primaryAction: (
              <BookingButton
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleSubmit}
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                Gå til oversikt →
              </BookingButton>
            ),
            secondaryAction: (
              <Link to={ROUTES_MAP['booking.public.appointment.session.select-services'].href}>
                <BookingButton type="button" variant="outline" size="md" fullWidth>
                  Tilbake
                </BookingButton>
              </Link>
            ),
          }}
          desktopClassName="sticky bottom-4 rounded-lg border border-primary bg-primary p-4 text-primary-foreground shadow-lg"
        />
      )}
    </>
  );
}
