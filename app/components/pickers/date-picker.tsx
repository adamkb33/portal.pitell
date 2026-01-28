import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// ISO (YYYY-MM-DD) for URL param/state
function toIsoDate(date: Date) {
  // keep as calendar-date only
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString().slice(0, 10);
}

export type DatePickerProps = {
  id?: string;
  buttonId?: string;
  selectedDate?: string; // ISO YYYY-MM-DD
  onChange?: (isoDate: string) => void; // ISO YYYY-MM-DD
  isDateAllowed?: (date: Date) => boolean;
  minDate?: Date;
  maxDate?: Date;
};

export function DatePicker({
  id = 'date',
  buttonId = 'date-picker',
  selectedDate,
  onChange,
  isDateAllowed,
  minDate,
  maxDate,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  // local input text, seeded from selectedDate
  const [value, setValue] = React.useState<string>(selectedDate ?? '');
  const [date, setDate] = React.useState<Date | undefined>(selectedDate ? parseDate(selectedDate) : undefined);
  const [month, setMonth] = React.useState<Date | undefined>(date);

  // keep internal state in sync when parent changes selectedDate
  React.useEffect(() => {
    if (!selectedDate) {
      setValue('');
      setDate(undefined);
      setMonth(undefined);
      return;
    }
    const d = parseDate(selectedDate);
    setDate(d || undefined);
    setMonth(d || undefined);
    setValue(selectedDate); // keep raw ISO in the input; you could prettify if you prefer
  }, [selectedDate]);

  return (
    <div className="flex flex-col gap-3 w-max">
      <div className="relative flex gap-2">
        <Input
          id={id}
          value={value}
          placeholder="YYYY-MM-DD"
          className="bg-background pr-10"
          onChange={(e) => {
            const next = e.target.value;
            setValue(next);
            const d = parseDate(next);
            if (d) {
              setDate(d);
              setMonth(d);
              onChange?.(toIsoDate(d));
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
            }
          }}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button id={buttonId} variant="ghost" className="absolute top-1/2 right-2 size-6 -translate-y-1/2">
              <CalendarIcon className="size-3.5" />
              <span className="sr-only">Select date</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              captionLayout="dropdown"
              month={month}
              onMonthChange={setMonth}
              onSelect={(d) => {
                setDate(d);
                if (d) {
                  const iso = toIsoDate(d);
                  setValue(iso);
                  onChange?.(iso);
                }
                setOpen(false);
              }}
              hidden={minDate ? { before: minDate, after: maxDate } : undefined}
              disabled={(date) => (isDateAllowed ? !isDateAllowed(date) : false)}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

function parseDate(value: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}
