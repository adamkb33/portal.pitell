import type React from 'react';
import { FormDialog } from '~/components/dialog/form-dialog';
import { Button } from '~/components/ui/button';
import { Calendar } from '~/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { TimePicker } from '~/components/pickers/time-picker';
import { cn } from '~/lib/utils';
import { format, isSameDay, startOfDay } from 'date-fns';
import { Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

export type UnavailabilityRangeFormData = {
  id: string;
  dateRange: DateRange | undefined;
  startTime: string;
  endTime: string;
};

export type UnavailabilityFormData = {
  ranges: UnavailabilityRangeFormData[];
};

export const createEmptyRange = (): UnavailabilityRangeFormData => {
  const today = startOfDay(new Date());
  return {
    id: String(Date.now()) + Math.random().toString(36).slice(2),
    dateRange: { from: today, to: today },
    startTime: '',
    endTime: '',
  };
};

export const emptyFormData: UnavailabilityFormData = {
  ranges: [createEmptyRange()],
};

type TimePickerState = {
  rangeId: string;
  field: 'startTime' | 'endTime';
} | null;

type ScheduleUnavailabilityFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  formData: UnavailabilityFormData;
  formErrors: Record<string, Partial<Record<'dateRange' | 'startTime' | 'endTime', string>>>;
  formError: string | null;
  onSubmit: (event: React.FormEvent) => void;
  onFieldChange: (rangeId: string, field: keyof UnavailabilityRangeFormData, value: any) => void;
  onRemoveRange: (rangeId: string) => void;
  onAddRange: () => void;
  isDatePickerOpen: boolean;
  setIsDatePickerOpen: (open: boolean) => void;
  activeRangeId: string | null;
  setActiveRangeId: (rangeId: string | null) => void;
  isTimePickerOpen: boolean;
  setIsTimePickerOpen: (open: boolean) => void;
  activeTimePicker: TimePickerState;
  setActiveTimePicker: (next: TimePickerState) => void;
  today: Date;
};

export function ScheduleUnavailabilityFormDialog({
  open,
  onOpenChange,
  onCancel,
  formData,
  formErrors,
  formError,
  onSubmit,
  onFieldChange,
  onRemoveRange,
  onAddRange,
  isDatePickerOpen,
  setIsDatePickerOpen,
  activeRangeId,
  setActiveRangeId,
  isTimePickerOpen,
  setIsTimePickerOpen,
  activeTimePicker,
  setActiveTimePicker,
  today,
}: ScheduleUnavailabilityFormDialogProps) {
  return (
    <FormDialog<UnavailabilityFormData>
      open={open}
      onOpenChange={onOpenChange}
      title="Legg til fravær"
      formData={formData}
      onFieldChange={() => {}}
      onSubmit={onSubmit}
      fields={[
        {
          name: 'ranges',
          label: 'Perioder',
          render: ({ value }) => {
            const ranges = (value as UnavailabilityRangeFormData[]) || [];

            return (
              <div className="space-y-4">
                {ranges.map((range, index) => {
                  const rangeErrors = formErrors[range.id] || {};
                  const isSingleDayRange =
                    !!range.dateRange?.from &&
                    !!range.dateRange?.to &&
                    isSameDay(range.dateRange.from, range.dateRange.to);
                  const label = range.dateRange?.from
                    ? range.dateRange.to
                      ? `${format(range.dateRange.from, 'dd.MM.yyyy')} – ${format(range.dateRange.to, 'dd.MM.yyyy')}`
                      : format(range.dateRange.from, 'dd.MM.yyyy')
                    : 'Velg periode';

                  return (
                    <div key={range.id} className="rounded-lg border border-card-border bg-card p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-card-text">Periode {index + 1}</p>
                        {ranges.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-form-invalid"
                            onClick={() => onRemoveRange(range.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <Popover
                        open={isDatePickerOpen && activeRangeId === range.id}
                        onOpenChange={(open) => {
                          setIsDatePickerOpen(open);
                          setActiveRangeId(open ? range.id : null);
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              'w-full justify-between h-11 bg-form-bg border-form-border text-form-text',
                              !range.dateRange?.from && 'text-form-text-muted',
                            )}
                          >
                            <span className="text-sm">{label}</span>
                            <CalendarIcon className="h-4 w-4 opacity-60" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="range"
                            selected={range.dateRange}
                            onSelect={(nextRange) => onFieldChange(range.id, 'dateRange', nextRange)}
                            hidden={{ before: today }}
                            numberOfMonths={1}
                            className="rounded-md border"
                          />
                        </PopoverContent>
                        {rangeErrors.dateRange && (
                          <p className="mt-1.5 text-xs text-form-invalid">{rangeErrors.dateRange}</p>
                        )}
                      </Popover>

                      {isSingleDayRange ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-form-text">Starttid</label>
                            <TimePicker
                              value={range.startTime || '00:00'}
                              placeholder="Velg starttid"
                              isOpen={
                                isTimePickerOpen &&
                                activeTimePicker?.rangeId === range.id &&
                                activeTimePicker.field === 'startTime'
                              }
                              onOpenChange={(open) => {
                                setIsTimePickerOpen(open);
                                setActiveTimePicker(open ? { rangeId: range.id, field: 'startTime' } : null);
                              }}
                              onChange={(nextValue) => onFieldChange(range.id, 'startTime', nextValue)}
                              zIndex={60}
                            />
                            {rangeErrors.startTime && (
                              <p className="text-xs text-form-invalid">{rangeErrors.startTime}</p>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-form-text">Sluttid</label>
                            <TimePicker
                              value={range.endTime || '23:59'}
                              placeholder="Velg sluttid"
                              isOpen={
                                isTimePickerOpen &&
                                activeTimePicker?.rangeId === range.id &&
                                activeTimePicker.field === 'endTime'
                              }
                              onOpenChange={(open) => {
                                setIsTimePickerOpen(open);
                                setActiveTimePicker(open ? { rangeId: range.id, field: 'endTime' } : null);
                              }}
                              onChange={(nextValue) => onFieldChange(range.id, 'endTime', nextValue)}
                              zIndex={60}
                            />
                            {(rangeErrors.endTime || formError) && (
                              <p className="text-xs text-form-invalid">{rangeErrors.endTime || formError}</p>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}

                <Button type="button" variant="outline" className="w-full h-11" onClick={onAddRange}>
                  Legg til periode
                </Button>
              </div>
            );
          },
        },
      ]}
      actions={[
        {
          label: 'Avbryt',
          variant: 'outline',
          onClick: onCancel,
        },
        {
          label: 'Lagre',
          variant: 'default',
          type: 'submit',
        },
      ]}
    />
  );
}
