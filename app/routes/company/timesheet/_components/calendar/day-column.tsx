import { useState } from 'react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import type { TimesheetDayEntryDto } from '~/api/generated/timesheet';
import { TimePicker } from '~/components/pickers/time-picker';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { cn } from '~/lib/utils';
import type { DayFormState } from '../../_types/timesheet.types';
import { buildEditHref } from '../../_utils';
import { HOURS, SLOT_HEIGHT_PX } from './constants';
import { HourSlots } from './hour-slots';
import { SubmittedEntryBlock } from './submitted-entry-block';

type TimesheetDayColumnProps = {
  date: Date;
  dateKey: string;
  formState: DayFormState;
  submittedEntries: TimesheetDayEntryDto[];
  onDayFormChange: (dateKey: string, patch: Partial<DayFormState>) => void;
  disabled?: boolean;
  showHourLabels?: boolean;
};

export function TimesheetDayColumn({
  date,
  dateKey,
  formState,
  submittedEntries,
  onDayFormChange,
  disabled,
  showHourLabels = false,
}: TimesheetDayColumnProps) {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const entryMode = formState.entryMode;
  const inputsDisabled = disabled;

  return (
    <div className="min-w-[180px] overflow-hidden rounded-lg border border-border/70 bg-card">
      <div className="flex items-start justify-between gap-2 border-b px-2 py-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {format(date, 'EEE', { locale: nb })}
          </p>
          <p className="truncate text-sm font-medium">{format(date, 'd. MMM', { locale: nb })}</p>
        </div>

        <div className="flex items-center gap-1">
          <Popover open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={disabled}>
                Registrer
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="end">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground">Ny registrering</p>
                {entryMode === 'RANGE' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="mb-1 text-[10px] font-medium text-muted-foreground">Fra</p>
                      <TimePicker
                        value={formState.fromTime}
                        placeholder="00:00"
                        isOpen={!inputsDisabled && formState.activePicker === 'from'}
                        onOpenChange={(open) =>
                          !inputsDisabled && onDayFormChange(dateKey, { activePicker: open ? 'from' : null })
                        }
                        onChange={(value) =>
                          !inputsDisabled && onDayFormChange(dateKey, { fromTime: value, activePicker: null })
                        }
                        disabled={inputsDisabled}
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-medium text-muted-foreground">Til</p>
                      <TimePicker
                        value={formState.toTime}
                        placeholder="00:00"
                        isOpen={!inputsDisabled && formState.activePicker === 'to'}
                        onOpenChange={(open) =>
                          !inputsDisabled && onDayFormChange(dateKey, { activePicker: open ? 'to' : null })
                        }
                        onChange={(value) =>
                          !inputsDisabled && onDayFormChange(dateKey, { toTime: value, activePicker: null })
                        }
                        disabled={inputsDisabled}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="mb-1 text-[10px] font-medium text-muted-foreground">Timer</p>
                    <Input
                      type="number"
                      min="0.25"
                      step="0.25"
                      value={formState.hours}
                      onChange={(event) => !inputsDisabled && onDayFormChange(dateKey, { hours: event.target.value })}
                      disabled={inputsDisabled}
                      className="h-9 text-sm"
                      placeholder="f.eks. 7.5"
                    />
                  </div>
                )}
                <div className="flex justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsRegisterOpen(false)}>
                    Ferdig
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className={cn('relative border-t bg-muted/10 px-2 py-1', showHourLabels ? 'pl-10' : '')}>
        {showHourLabels && (
          <div className="absolute left-1 top-1 bottom-1 w-8">
            <HourSlots showLabels />
          </div>
        )}

        <div className="relative" style={{ height: `${HOURS.length * SLOT_HEIGHT_PX}px` }}>
          <HourSlots />
          {submittedEntries.map((entry, index) => (
            <SubmittedEntryBlock
              key={entry.id ?? `${dateKey}-${index}`}
              entry={entry}
              editHref={buildEditHref(entry)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
