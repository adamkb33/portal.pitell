import { addDays, format, isSameDay, parseISO } from 'date-fns';
import type { TimesheetDayEntryDto } from '~/api/generated/timesheet';
import { Card, CardContent } from '~/components/ui/card';
import type { DayFormState } from '../_types/timesheet.types';
import { createDefaultDayFormState } from '../_utils';
import { TimesheetDayColumn } from './calendar/day-column';

export type TimesheetWeekCardProps = {
  startDate: string;
  entries: TimesheetDayEntryDto[];
  dayForms: Record<string, DayFormState>;
  onDayFormChange: (dateKey: string, patch: Partial<DayFormState>) => void;
  disabled?: boolean;
};

export function TimesheetWeekCard({ startDate, entries, dayForms, onDayFormChange, disabled }: TimesheetWeekCardProps) {
  const weekStartDate = parseISO(startDate);

  const dayColumns = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStartDate, index);
    const dateKey = format(date, 'yyyy-MM-dd');
    const submittedEntries = entries.filter((entry) => {
      if (!entry.date) return false;
      return isSameDay(parseISO(entry.date), date);
    });

    return {
      date,
      dateKey,
      submittedEntries,
      formState: dayForms[dateKey] ?? createDefaultDayFormState(dateKey, 'RANGE'),
    };
  });

  return (
    <Card className="border-none">
      <CardContent className="space-y-3 px-0">
        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[1280px] grid-cols-7 gap-2 px-1">
            {dayColumns.map(({ date, dateKey, submittedEntries, formState }, index) => (
              <TimesheetDayColumn
                key={dateKey}
                date={date}
                dateKey={dateKey}
                formState={formState}
                submittedEntries={submittedEntries}
                onDayFormChange={onDayFormChange}
                disabled={disabled}
                showHourLabels={index === 0}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
