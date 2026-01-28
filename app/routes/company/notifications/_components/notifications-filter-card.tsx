import { Form, Link } from 'react-router';
import type { RefObject } from 'react';
import type { DateRange } from 'react-day-picker';
import { Calendar } from '~/components/ui/calendar';
import { Label } from '~/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { Button } from '~/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import type { NotificationReadFilter } from '../_utils/query';

type Props = {
  formRef: RefObject<HTMLFormElement | null>;
  fromDate: string;
  toDate: string;
  dateRange: DateRange | undefined;
  readFilter: NotificationReadFilter;
  pageSize: number;
  resetHref: string;
  onRangeSelect: (range: DateRange | undefined) => void;
  onReadFilterChange: (value: NotificationReadFilter) => void;
};

export function NotificationsFilterCard({
  formRef,
  fromDate,
  toDate,
  dateRange,
  readFilter,
  pageSize,
  resetHref,
  onRangeSelect,
  onReadFilterChange,
}: Props) {
  return (
    <Form ref={formRef} method="get" className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
      <div className="grid gap-3 md:grid-cols-2 xl:min-w-[28rem]">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Dato</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" type="button" className="h-10 w-full justify-start text-left text-sm">
                {fromDate ? (toDate ? `${fromDate} - ${toDate}` : `${fromDate} -`) : 'Velg fra- og til-dato'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={onRangeSelect}
                numberOfMonths={1}
                className="rounded-md border"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</Label>
          <Select value={readFilter} onValueChange={(value) => onReadFilterChange(value as NotificationReadFilter)}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Velg status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="unread">Uleste</SelectItem>
              <SelectItem value="read">Leste</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <input type="hidden" name="fromDate" value={fromDate} />
      <input type="hidden" name="toDate" value={toDate} />
      <input type="hidden" name="read" value={readFilter} />
      <input type="hidden" name="page" value="0" />
      <input type="hidden" name="size" value={pageSize} />

      <div className="flex items-center gap-2 xl:pb-0.5">
        <Link to={resetHref} className="text-xs text-muted-foreground underline">
          Nullstill filtre
        </Link>
      </div>
    </Form>
  );
}
