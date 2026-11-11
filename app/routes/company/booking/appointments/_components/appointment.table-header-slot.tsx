import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Check, Search, SlidersHorizontal, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { Calendar, type CalendarDateRange } from '~/ui';
import { toDateInputFromOffsetDateTime } from '~/lib/query';
import {
  AppointmentPaginationQuickFilter,
  AppointmentPaginationService,
} from '../_services/appointment.pagination-service';
import {
  Button,
  cn,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '~/ui';

const PRESETS = [
  [AppointmentPaginationQuickFilter.TODAY, 'I dag'],
  [AppointmentPaginationQuickFilter.TOMORROW, 'I morgen'],
  [AppointmentPaginationQuickFilter.THIS_WEEK, 'Denne uken'],
  [AppointmentPaginationQuickFilter.NEXT_7_DAYS, 'Neste 7 dager'],
  [AppointmentPaginationQuickFilter.NEXT_30_DAYS, 'Neste 30 dager'],
] as const;

const PRESET_FILTERS: Array<AppointmentPaginationQuickFilter | null> = PRESETS.map(([filter]) => filter);

/** Phones get a bottom sheet, wider screens a popover under the button. */
function useIsDesktop() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia('(min-width: 640px)');
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    },
    () => window.matchMedia('(min-width: 640px)').matches,
    () => true,
  );
}

const formatRangeDate = (value: string) => (value ? format(new Date(`${value}T00:00:00`), 'd. MMM', { locale: nb }) : '');

export function AppointmentTableHeaderSlot() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const isDesktop = useIsDesktop();

  const paginationService = useMemo(
    () => new AppointmentPaginationService(searchParams, navigate),
    [searchParams, navigate],
  );

  const fromDateTime = searchParams.get('fromDateTime') || '';
  const toDateTime = searchParams.get('toDateTime') || '';
  const searchFilter = searchParams.get('search') || '';

  const activeQuickFilter = paginationService.getActiveQuickFilter();
  const activePreset = PRESET_FILTERS.includes(activeQuickFilter) ? activeQuickFilter : null;
  // A custom range has both dates and matches no preset. "Kommende" and "Tidligere" are open-ended, so their
  // "from now" / "until now" date is not a chosen day and must not show up in the calendar.
  const isCustomRange = Boolean(fromDateTime && toDateTime) && activeQuickFilter === null;
  const dateFilterActive = activePreset !== null || isCustomRange;

  const fromDate = isCustomRange ? toDateInputFromOffsetDateTime(fromDateTime) : '';
  const toDate = isCustomRange ? toDateInputFromOffsetDateTime(toDateTime) : '';

  const [localFromDate, setLocalFromDate] = useState(fromDate);
  const [localToDate, setLocalToDate] = useState(toDate);
  const [localSearchFilter, setLocalSearchFilter] = useState(searchFilter);
  const lastSubmittedSearchRef = useRef(searchFilter.trim());

  useEffect(() => {
    setLocalFromDate(fromDate);
    setLocalToDate(toDate);
  }, [fromDate, toDate]);

  useEffect(() => {
    const normalizedSearchFilter = searchFilter.trim();
    if (normalizedSearchFilter === lastSubmittedSearchRef.current) return;

    setLocalSearchFilter(searchFilter);
    lastSubmittedSearchRef.current = normalizedSearchFilter;
  }, [searchFilter]);

  useEffect(() => {
    const normalizedSearch = localSearchFilter.trim();
    const timeoutId = setTimeout(() => {
      if (normalizedSearch === lastSubmittedSearchRef.current) return;
      lastSubmittedSearchRef.current = normalizedSearch;
      paginationService.handleSearchChange(normalizedSearch);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [localSearchFilter, paginationService]);

  const hasChosenDates = Boolean(localFromDate || localToDate);
  const canClear = dateFilterActive || hasChosenDates || Boolean(searchFilter);

  const handleApplyDateFilters = () => {
    // One chosen day means that day only.
    paginationService.applyDateFilters(localFromDate, localToDate || localFromDate);
    setIsFilterOpen(false);
  };

  const handleRemoveSearchFilter = () => {
    lastSubmittedSearchRef.current = '';
    setLocalSearchFilter('');
    paginationService.handleRemoveFilter('search');
  };

  const handleClearFilters = () => {
    lastSubmittedSearchRef.current = '';
    setLocalSearchFilter('');
    setLocalFromDate('');
    setLocalToDate('');
    paginationService.handleClearFilters();
    setIsFilterOpen(false);
  };

  const handleQuickFilterClick = (filter: AppointmentPaginationQuickFilter) => {
    switch (filter) {
      case AppointmentPaginationQuickFilter.UPCOMING:
        paginationService.handleUpcomingFilter();
        break;
      case AppointmentPaginationQuickFilter.TODAY:
        paginationService.handleTodayFilter();
        break;
      case AppointmentPaginationQuickFilter.TOMORROW:
        paginationService.handleTomorrowFilter();
        break;
      case AppointmentPaginationQuickFilter.THIS_WEEK:
        paginationService.handleThisWeekFilter();
        break;
      case AppointmentPaginationQuickFilter.PAST:
        paginationService.handlePastFilter();
        break;
      case AppointmentPaginationQuickFilter.NEXT_7_DAYS:
        paginationService.handleNext7days();
        break;
      case AppointmentPaginationQuickFilter.NEXT_30_DAYS:
        paginationService.handleNext30Days();
        break;
    }
  };

  const handlePresetClick = (filter: AppointmentPaginationQuickFilter) => {
    setLocalFromDate('');
    setLocalToDate('');
    handleQuickFilterClick(filter);
    setIsFilterOpen(false);
  };

  const rangeLabel = hasChosenDates
    ? localToDate && localToDate !== localFromDate
      ? `${formatRangeDate(localFromDate)} – ${formatRangeDate(localToDate)}`
      : formatRangeDate(localFromDate)
    : '';

  const calendar = (
    <Calendar
      mode="range"
      selected={{
        from: localFromDate ? new Date(`${localFromDate}T00:00:00`) : undefined,
        to: localToDate ? new Date(`${localToDate}T00:00:00`) : undefined,
      }}
      onSelect={(range: CalendarDateRange | undefined) => {
        setLocalFromDate(range?.from ? format(range.from, 'yyyy-MM-dd') : '');
        setLocalToDate(range?.to ? format(range.to, 'yyyy-MM-dd') : '');
      }}
      numberOfMonths={1}
      className="rounded-lg border border-border bg-background"
    />
  );

  const clearButton = (
    <button
      type="button"
      disabled={!canClear}
      onClick={handleClearFilters}
      className="inline-flex min-h-11 items-center rounded-md px-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-interactive/5 focus-visible:outline-2 focus-visible:outline-interactive disabled:text-text-disabled disabled:hover:bg-transparent sm:min-h-9"
    >
      Nullstill
    </button>
  );

  const applyButton = (
    <button
      type="button"
      disabled={!hasChosenDates}
      onClick={handleApplyDateFilters}
      className={cn(
        'inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive sm:min-h-10',
        hasChosenDates
          ? 'bg-interactive text-white hover:bg-interactive-hover'
          : 'cursor-not-allowed border border-border bg-slate-100 text-text-secondary',
      )}
    >
      Bruk periode
    </button>
  );

  // Same height and radius as the search field. Blue and filled-tint while a filter is on, so it is obvious.
  const filterButton = (
    <button
      type="button"
      className={cn(
        'inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border px-3.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-interactive sm:h-10',
        dateFilterActive
          ? 'border-interactive bg-interactive/10 text-blue-700 hover:bg-interactive/15'
          : 'border-border bg-background text-text-primary hover:bg-interactive/5',
      )}
    >
      <SlidersHorizontal className="size-4" aria-hidden />
      Filtrer
      {dateFilterActive ? (
        <span className="grid size-5 place-items-center rounded-full bg-interactive text-xs font-bold text-white">
          1<span className="sr-only"> aktivt filter</span>
        </span>
      ) : null}
    </button>
  );

  const presetChipClass = (active: boolean) =>
    cn(
      'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-interactive',
      active
        ? 'border-interactive bg-interactive/10 font-semibold text-blue-700'
        : 'border-border bg-background text-text-primary hover:bg-interactive/5',
    );

  const presetRowClass = (active: boolean) =>
    cn(
      'flex min-h-9 w-full items-center gap-2 rounded-md px-3 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-interactive',
      active ? 'bg-interactive/10 font-semibold text-blue-700' : 'text-text-primary hover:bg-interactive/5',
    );

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Søk etter kunde"
            placeholder="Søk etter kunde..."
            value={localSearchFilter}
            onChange={(e) => setLocalSearchFilter(e.target.value)}
            className="h-11 border-border bg-background pl-9 pr-9 text-base sm:h-10"
          />
          {localSearchFilter && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Tøm søk"
              className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
              onClick={handleRemoveSearchFilter}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {isDesktop ? (
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>{filterButton}</PopoverTrigger>
            <PopoverContent
              className="w-[30rem] max-w-[calc(100vw-2rem)] border-border bg-background p-0"
              align="end"
            >
              <div className="flex">
                <div className="w-40 shrink-0 space-y-0.5 border-r border-border p-3">
                  {PRESETS.map(([filter, label]) => (
                    <button
                      key={filter}
                      type="button"
                      aria-pressed={activePreset === filter}
                      onClick={() => handlePresetClick(filter)}
                      className={presetRowClass(activePreset === filter)}
                    >
                      {activePreset === filter ? <Check className="size-4" aria-hidden /> : null}
                      {label}
                    </button>
                  ))}
                  <p className="px-3 pt-2 text-xs text-text-secondary">Eller velg dager i kalenderen</p>
                </div>
                <div className="flex-1 p-3">{calendar}</div>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2.5">
                {clearButton}
                <span className="text-sm text-text-secondary">{rangeLabel}</span>
                {applyButton}
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>{filterButton}</SheetTrigger>
            <SheetContent
              side="bottom"
              showCloseButton={false}
              className="max-h-[92vh] gap-0 overflow-y-auto rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
            >
              <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-border" aria-hidden />
              <div className="flex items-center justify-between">
                <SheetTitle className="text-lg">Filtrer</SheetTitle>
                {clearButton}
              </div>
              <SheetDescription className="sr-only">Velg periode for timebestillingene</SheetDescription>

              <p className="mb-2 mt-2 text-sm font-semibold text-text-primary">Periode</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map(([filter, label]) => (
                  <button
                    key={filter}
                    type="button"
                    aria-pressed={activePreset === filter}
                    onClick={() => handlePresetClick(filter)}
                    className={presetChipClass(activePreset === filter)}
                  >
                    {activePreset === filter ? <Check className="size-4" aria-hidden /> : null}
                    {label}
                  </button>
                ))}
              </div>

              <p className="mb-2 mt-4 text-sm font-semibold text-text-primary">Egendefinert periode</p>
              <div className="flex justify-center">{calendar}</div>
              {rangeLabel ? <p className="mt-2 text-center text-sm text-text-secondary">{rangeLabel}</p> : null}

              <div className="mt-3 flex flex-col gap-1.5">
                {applyButton}
                {!hasChosenDates ? (
                  <p className="text-center text-xs text-text-secondary">Velg en dato eller en periode</p>
                ) : null}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>

      {/* "I dag" is no longer a tab: today is the first day group in the list. */}
      <div
        role="group"
        aria-label="Avtaleperiode"
        className="order-first flex w-full gap-0.5 rounded-lg border border-border bg-background p-0.5 sm:w-fit"
      >
        {(
          [
            [AppointmentPaginationQuickFilter.UPCOMING, 'Kommende'],
            [AppointmentPaginationQuickFilter.PAST, 'Tidligere'],
          ] as const
        ).map(([filter, label]) => {
          const active = activeQuickFilter === filter;
          return (
            <button
              key={filter}
              type="button"
              aria-pressed={active}
              onClick={() => handleQuickFilterClick(filter)}
              className={`h-11 flex-1 rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-interactive sm:h-9 sm:flex-none ${
                active ? 'bg-interactive/10 text-interactive' : 'text-text-secondary hover:bg-interactive/5'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
