import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import { Button, Calendar, Popover, PopoverContent, PopoverTrigger } from '~/ui';

type DateFieldProps = {
  /** `yyyy-MM-dd` */
  value: string;
  onChange: (day: string) => void;
  /** Earliest day that can be picked, `yyyy-MM-dd`. */
  minDay?: string;
  id?: string;
  'aria-labelledby'?: string;
};

/**
 * A date field: shows the day ("Torsdag 12.11.2026") and opens the calendar; one click picks the day and closes it.
 * The plain, standard control for every date in a company form.
 */
export function DateField({ value, onChange, minDay, id, ...aria }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date | undefined>(undefined);
  const day = parseISO(value);
  const shown = format(day, 'EEEE dd.MM.yyyy', { locale: nb });

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Open on the chosen day's month; the arrows move from there.
        if (next) setMonth(day);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          {...aria}
          className="h-11 w-full min-w-0 justify-between border-field-border bg-background px-3 font-normal tabular-nums sm:h-10"
        >
          <span className="truncate">{shown.charAt(0).toUpperCase() + shown.slice(1)}</span>
          <CalendarDays className="text-text-secondary" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={day}
          month={month}
          onMonthChange={setMonth}
          disabled={minDay ? { before: parseISO(minDay) } : undefined}
          onSelect={(next) => {
            if (!(next instanceof Date)) return;
            onChange(format(next, 'yyyy-MM-dd'));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
