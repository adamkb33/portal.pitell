import { formatOsloTime } from '~/lib/oslo-time';
import * as React from 'react';
import { Button } from '~/ui';
import type { ScheduleDto, ScheduleTimeSlot } from '~/api/generated';

export type TimeSlotPickerProps = {
  schedule: ScheduleDto;
  selectedTimeSlot?: string | null; // format: ISO datetime e.g. "2025-11-16T09:00:00"
  onChange?: (value: string) => void;
  /**
   * Optional external predicate to disable a slot.
   * If provided, it's ANDed with built-in "past slot" check.
   */
  isSlotAllowed?: (slot: ScheduleTimeSlot) => boolean;
};

export function TimeSlotPicker({ schedule, selectedTimeSlot, onChange, isSlotAllowed }: TimeSlotPickerProps) {
  const [value, setValue] = React.useState<string | null | undefined>(selectedTimeSlot);

  // keep internal in sync with parent
  React.useEffect(() => {
    setValue(selectedTimeSlot);
  }, [selectedTimeSlot]);

  const slots = schedule?.timeSlots ?? [];
  const hasSlots = slots.length > 0;

  const handlePick = (startDateTime: string) => {
    setValue(startDateTime);
    onChange?.(startDateTime);
  };

  return (
    <div className="relative flex flex-col gap-4">
      <div id="time-slot" role="listbox" aria-label="Tilgjengelige tidspunkt" className="mt-1">
        {!hasSlots ? (
          <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-border/70 bg-muted/40 px-4 py-6 text-sm">
            <p className="font-medium">Ingen ledige timer denne dagen.</p>
            <p className="text-xs text-muted-foreground">
              Prøv en annen dato, eller kontakt oss dersom du trenger hjelp til å finne et tidspunkt.
            </p>
          </div>
        ) : (
          <div className="flex h-64 flex-wrap gap-2 overflow-y-auto rounded-md border border-border/60 bg-muted/40 p-2 animate-in fade-in-0 duration-150">
            {slots.map((slot) => {
              const startDateTime = slot.startTime; // LocalDateTime string
              const endDateTime = slot.endTime; // LocalDateTime string
              const selected = startDateTime === value;

              const disabledBecausePast = isPastSlot(endDateTime);
              const externallyBlocked = isSlotAllowed ? !isSlotAllowed(slot) : false;
              const disabled = disabledBecausePast || externallyBlocked;

              return (
                <Button
                  key={startDateTime}
                  type="button"
                  variant={selected ? 'primary' : 'outline'}
                  className={[
                    'justify-center rounded-md px-3 py-2 text-sm',
                    'transition-all duration-150',
                    'w-[calc(50%-0.25rem)]',
                    'sm:w-[calc(33.333%-0.5rem)]',
                    'md:w-[calc(25%-0.5rem)]',
                    'lg:w-[calc(20%-0.5rem)]',
                    'border bg-card',
                    selected
                      ? 'bg-primary text-primary-foreground border-primary shadow-md ring-1 ring-primary/70 hover:bg-primary/90'
                      : 'text-foreground border-border hover:-translate-y-[1px] hover:shadow-sm hover:border-primary/40 hover:bg-accent/40',
                    disabled
                      ? 'cursor-not-allowed opacity-50 hover:translate-y-0 hover:shadow-none hover:bg-card hover:border-border'
                      : '',
                  ].join(' ')}
                  aria-pressed={selected}
                  aria-selected={selected}
                  role="option"
                  disabled={disabled}
                  onClick={() => handlePick(startDateTime)}
                  title={`${formatTimeOnly(startDateTime)}–${formatTimeOnly(endDateTime)}`}
                >
                  <span className="tabular-nums font-semibold">{formatTimeOnly(startDateTime)}</span>
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer: availability + gentle urgency */}
      <footer className="mt-1 flex items-center justify-between gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-medium uppercase tracking-widest text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          {hasSlots ? `${slots.length} ledige tidspunkt` : 'Ingen ledige tidspunkt'}
        </span>

        {hasSlots && <span className="text-[11px] text-muted-foreground">Populære tidspunkt fylles raskt opp.</span>}
      </footer>
    </div>
  );
}

/** HH:mm in shop time (Oslo), whatever zone the browser is in */
function formatTimeOnly(dateTime: string): string {
  return formatOsloTime(dateTime);
}

/** Check if a slot's end time is in the past */
function isPastSlot(endDateTime: string): boolean {
  const end = new Date(endDateTime);
  return end.getTime() < Date.now();
}
