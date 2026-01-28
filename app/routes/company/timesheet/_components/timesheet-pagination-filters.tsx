import { useEffect, useMemo, useState, type RefObject } from 'react';
import type { DateRange } from 'react-day-picker';
import { Form, Link } from 'react-router';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Calendar } from '~/components/ui/calendar';
import { Checkbox } from '~/components/ui/checkbox';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';

type TimesheetPaginationFilters = {
  fromDate?: string | null;
  toDate?: string | null;
  entryMode?: string | null;
  page?: number | null;
  size?: number | null;
  statuses?: string[] | null;
};

type StatusOption = {
  value: string;
  label: string;
};

type Props = {
  formRef: RefObject<HTMLFormElement | null>;
  filters: TimesheetPaginationFilters;
  fromDate: string;
  toDate: string;
  dateRange: DateRange | undefined;
  resetHref: string;
  selectedStatuses?: Set<string>;
  statusOptions?: StatusOption[];
  showDateRange?: boolean;
  showEntryMode?: boolean;
  onRangeSelect: (range: DateRange | undefined) => void;
  onSubmitDebounced: () => void;
};

export function TimesheetPaginationFilterCard({
  formRef,
  filters,
  fromDate,
  toDate,
  dateRange,
  resetHref,
  selectedStatuses,
  statusOptions,
  showDateRange = true,
  showEntryMode = true,
  onRangeSelect,
  onSubmitDebounced,
}: Props) {
  const shouldShowStatuses = Boolean(statusOptions?.length);
  const [selectedStatusValues, setSelectedStatusValues] = useState<string[]>([]);

  useEffect(() => {
    setSelectedStatusValues(Array.from(selectedStatuses ?? []));
  }, [selectedStatuses]);

  const statusValueSet = useMemo(() => new Set(selectedStatusValues), [selectedStatusValues]);

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-base">Filtre</CardTitle>
      </CardHeader>
      <CardContent>
        <Form ref={formRef} method="get" className="space-y-4" onChange={onSubmitDebounced}>
          {(showDateRange || showEntryMode) && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {showDateRange && (
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Datointervall
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" type="button" className="h-10 w-full justify-start text-left text-sm">
                        {fromDate ? (toDate ? `${fromDate} - ${toDate}` : `${fromDate} -`) : 'Velg fra/til dato'}
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
                  <input type="hidden" name="fromDate" value={fromDate} />
                  <input type="hidden" name="toDate" value={toDate} />
                </div>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Side</Label>
              <Input type="number" min={0} name="page" defaultValue={filters.page ?? 0} className="h-10" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Størrelse
              </Label>
              <Input type="number" min={1} name="size" defaultValue={filters.size ?? 10} className="h-10" />
            </div>
            {shouldShowStatuses && (
              <div className="space-y-1 sm:col-span-2 lg:col-span-2">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </Label>
                <div className="flex min-h-10 items-center gap-4 rounded-sm border border-form-border bg-form-bg px-3">
                  {statusOptions?.map((option) => (
                    <label key={option.value} className="inline-flex items-center gap-2 text-xs text-form-text">
                      <Checkbox
                        checked={statusValueSet.has(option.value)}
                        onCheckedChange={(checked) => {
                          setSelectedStatusValues((prev) => {
                            const next = new Set(prev);
                            if (checked) {
                              next.add(option.value);
                            } else {
                              next.delete(option.value);
                            }
                            return Array.from(next);
                          });
                          onSubmitDebounced();
                        }}
                      />
                      {option.label}
                    </label>
                  ))}
                  {selectedStatusValues.map((value) => (
                    <input key={value} type="hidden" name="statuses" value={value} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link to={resetHref} className="text-xs text-muted-foreground underline">
              Nullstill
            </Link>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
