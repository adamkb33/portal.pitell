import { useState } from 'react';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { Badge } from '~/components/ui/badge';
import { Calendar as CalendarIcon, X, Search, Check } from 'lucide-react';
import { Calendar } from '~/components/ui/calendar';
import { useNavigate, useSearchParams } from 'react-router';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { toDateInputFromOffsetDateTime } from '~/lib/query';
import {
  AppointmentPaginationQuickFilter,
  AppointmentPaginationService,
} from '../_services/appointment.pagination-service';

export function AppointmentTableHeaderSlot() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const paginationService = new AppointmentPaginationService(searchParams, navigate);

  const fromDateTime = searchParams.get('fromDateTime') || '';
  const toDateTime = searchParams.get('toDateTime') || '';
  const searchFilter = searchParams.get('search') || '';

  const fromDate = toDateInputFromOffsetDateTime(fromDateTime);
  const toDate = toDateInputFromOffsetDateTime(toDateTime);

  const [localFromDate, setLocalFromDate] = useState(fromDate);
  const [localToDate, setLocalToDate] = useState(toDate);

  const hasActiveFilters = fromDate || toDate || searchFilter;
  const hasCustomDateFilter = (fromDate || toDate) && paginationService.getActiveQuickFilter() === null;

  const handleApplyDateFilters = () => {
    paginationService.applyDateFilters(localFromDate, localToDate);
    setIsDatePickerOpen(false);
  };

  const handleClearFilters = () => {
    setLocalFromDate('');
    setLocalToDate('');
    paginationService.handleClearFilters();
    setIsDatePickerOpen(false);
  };

  const activeQuickFilter = paginationService.getActiveQuickFilter();

  return (
    <div className="space-y-3 md:space-y-4 w-full">
      {/* Search Input */}
      <div className="relative max-w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Søk avtaler..."
          value={searchFilter}
          onChange={(e) => paginationService.handleSearchChange(e.target.value)}
          className="pl-9 pr-9 h-11 text-base md:h-10"
        />
        {searchFilter && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={() => paginationService.handleRemoveFilter('search')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Quick Filters - Wrapping on mobile */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={activeQuickFilter === AppointmentPaginationQuickFilter.UPCOMING ? 'secondary' : 'outline'}
          onClick={paginationService.handleUpcomingFilter}
          className="h-9"
        >
          Kommende
        </Button>
        <Button
          size="sm"
          variant={activeQuickFilter === AppointmentPaginationQuickFilter.TODAY ? 'secondary' : 'outline'}
          onClick={paginationService.handleTodayFilter}
          className="h-9"
        >
          I dag
        </Button>
        <Button
          size="sm"
          variant={activeQuickFilter === AppointmentPaginationQuickFilter.PAST ? 'secondary' : 'outline'}
          onClick={paginationService.handlePastFilter}
          className="h-9"
        >
          Fullførte
        </Button>

        {/* Separator */}
        <div className="w-px bg-border self-stretch hidden sm:block" />

        {/* Sort Direction Buttons */}
        <Button
          size="sm"
          variant={paginationService.getDirection() == 'ASC' ? 'default' : 'outline'}
          onClick={() => paginationService.setDirection('ASC')}
          className="h-9"
        >
          <span className="hidden sm:inline">Tidligste først</span>
          <span className="sm:hidden">↑ Tidligste</span>
        </Button>
        <Button
          size="sm"
          variant={paginationService.getDirection() == 'DESC' ? 'default' : 'outline'}
          onClick={() => paginationService.setDirection('DESC')}
          className="h-9"
        >
          <span className="hidden sm:inline">Seneste først</span>
          <span className="sm:hidden">↓ Seneste</span>
        </Button>
      </div>

      {/* Date Range Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={activeQuickFilter === AppointmentPaginationQuickFilter.NEXT_7_DAYS ? 'default' : 'outline'}
          onClick={paginationService.handleNext7days}
          className="h-9"
        >
          Neste 7 dager
        </Button>
        <Button
          size="sm"
          variant={activeQuickFilter === AppointmentPaginationQuickFilter.NEXT_30_DAYS ? 'default' : 'outline'}
          onClick={paginationService.handleNext30Days}
          className="h-9"
        >
          Neste 30 dager
        </Button>

        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button variant={hasCustomDateFilter ? 'default' : 'outline'} size="sm" className="h-9 gap-1.5 relative">
              <CalendarIcon className="h-3.5 w-3.5" />
              <span className="text-xs">Periode</span>
              {hasCustomDateFilter && (
                <Badge className="h-4 w-4 p-0 flex items-center justify-center ml-0.5">
                  <Check className="h-2.5 w-2.5" />
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Velg periode</h4>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="h-7 px-2 text-xs text-destructive"
                  >
                    Nullstill
                  </Button>
                )}
              </div>

              <Calendar
                mode="range"
                selected={{
                  from: localFromDate ? new Date(localFromDate) : undefined,
                  to: localToDate ? new Date(localToDate) : undefined,
                }}
                onSelect={(range: DateRange | undefined) => {
                  setLocalFromDate(range?.from ? format(range.from, 'yyyy-MM-dd') : '');
                  setLocalToDate(range?.to ? format(range.to, 'yyyy-MM-dd') : '');
                }}
                numberOfMonths={1}
                className="rounded-md border"
              />

              <Button
                onClick={handleApplyDateFilters}
                className="w-full h-9 text-sm"
                disabled={!localFromDate && !localToDate}
              >
                Bruk filter
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
