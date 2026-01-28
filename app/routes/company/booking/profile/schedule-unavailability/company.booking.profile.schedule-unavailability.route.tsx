import type { Route } from './+types/company.booking.profile.schedule-unavailability.route';
import { CompanyUserScheduleUnavailabilityController, type ScheduleUnavailabilityDto } from '~/api/generated/booking';
import { data, useFetcher, useNavigate, useSearchParams } from 'react-router';
import { CalendarOff, Plus, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { withAuth } from '~/api/utils/with-auth';
import { addDays, addMonths, format, isSameDay, startOfDay } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { resolveErrorPayload } from '~/lib/api-error';
import {
  formatDateBoundaryInTimeZone,
  formatDateInputInTimeZone,
  formatLocalDateTimeInTimeZone,
} from '~/lib/query';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import {
  ScheduleUnavailabilityFormDialog,
  createEmptyRange,
  emptyFormData,
  type UnavailabilityFormData,
  type UnavailabilityRangeFormData,
} from './_components/schedule-unavailability-form-dialog';

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const timezone = 'Europe/Oslo';
    const url = new URL(request.url);
    const range = url.searchParams.get('range') ?? '6m';
    const today = startOfDay(new Date());
    const isPastRange = range === 'prev6m';
    const rangeStartDate = isPastRange ? addMonths(today, -6) : today;
    const rangeEndDate = isPastRange
      ? today
      : range === '30d'
        ? addDays(today, 30)
        : range === '90d'
          ? addDays(today, 90)
          : range === '12m'
            ? addMonths(today, 12)
            : addMonths(today, 6);
    const fromDateTime = formatDateBoundaryInTimeZone(formatDateInputInTimeZone(rangeStartDate, timezone), 'start', timezone);
    const toDateTime = formatDateBoundaryInTimeZone(formatDateInputInTimeZone(rangeEndDate, timezone), 'end', timezone);

    const getResponse = await withAuth(request, async () => {
      return await CompanyUserScheduleUnavailabilityController.companyUserGetUnavailabilityRanges({
        query: {
          fromDateTime,
          toDateTime,
        },
      });
    });

    return data({
      schedules: getResponse.data?.data ?? [],
      error: null as string | null,
    });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke hente fravær');
    return data({ schedules: [], error: message }, { status: status ?? 400 });
  }
}

export async function action({ request }: Route.ActionArgs) {
  try {
    const formData = await request.formData();
    const rangesRaw = String(formData.get('ranges') ?? '[]');
    const ranges = JSON.parse(rangesRaw) as Array<{
      fromDate: string;
      toDate: string;
      startTime: string;
      endTime: string;
    }>;

    if (!Array.isArray(ranges) || ranges.length === 0) {
      return data({ error: 'Legg til minst én periode' }, { status: 400 });
    }

    const normalizeTime = (value: string) => (value.split(':').length === 2 ? `${value}:00` : value);
    const toTimeParts = (value: string) => {
      const [hours, minutes] = value.split(':').map((part) => Number(part));
      return { hours: Number.isFinite(hours) ? hours : 0, minutes: Number.isFinite(minutes) ? minutes : 0 };
    };
    const isTimeBeforeOrEqual = (candidate: string, baseline: string) => {
      const a = toTimeParts(candidate);
      const b = toTimeParts(baseline);
      if (a.hours !== b.hours) return a.hours < b.hours;
      return a.minutes <= b.minutes;
    };
    const timezone = 'Europe/Oslo';
    const payload = ranges.map((range) => {
      const startDate = range.fromDate;
      const endDate = range.toDate;
      const isTodayStartDate = startDate === format(new Date(), 'yyyy-MM-dd');
      const nextMinute = format(new Date(Date.now() + 60_000), 'HH:mm');
      const currentTime = format(new Date(), 'HH:mm');
      const requestedStartTime = range.startTime || (isTodayStartDate ? nextMinute : '00:00');
      const startTime =
        isTodayStartDate && isTimeBeforeOrEqual(requestedStartTime, currentTime) ? nextMinute : requestedStartTime;
      const endTime = range.endTime || '23:59';

      if (!startDate || !endDate) {
        throw new Error('Velg periode');
      }

      const fromDate = fromZonedTime(`${startDate}T${normalizeTime(startTime)}`, timezone);
      const toDate = fromZonedTime(`${endDate}T${normalizeTime(endTime)}`, timezone);
      if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
        throw new Error('Ugyldig dato eller tid');
      }
      if (fromDate >= toDate) {
        throw new Error('Sluttid må være etter starttid');
      }

      return {
        from: formatLocalDateTimeInTimeZone(startDate, startTime, timezone),
        to: formatLocalDateTimeInTimeZone(endDate, endTime, timezone),
      };
    });

    await withAuth(request, async () => {
      await CompanyUserScheduleUnavailabilityController.companyUserCreateUnavailabilityRanges({
        body: payload,
      });
    });

    return data({ success: true });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke lagre fravær');
    return data({ error: message }, { status: status ?? 400 });
  }
}

export default function CompanyBookingProfileScheduleUnavailabilityRoute({ loaderData }: Route.ComponentProps) {
  const { schedules, error } = loaderData;
  const fetcher = useFetcher<{ success?: boolean; error?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedRange, setSelectedRange] = useState(searchParams.get('range') ?? '6m');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState<UnavailabilityFormData>(emptyFormData);
  const [formErrors, setFormErrors] = useState<
    Record<string, Partial<Record<'dateRange' | 'startTime' | 'endTime', string>>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [activeRangeId, setActiveRangeId] = useState<string | null>(null);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [activeTimePicker, setActiveTimePicker] = useState<{
    rangeId: string;
    field: 'startTime' | 'endTime';
  } | null>(null);
  const today = startOfDay(new Date());

  useEffect(() => {
    if (fetcher.data?.success) {
      setIsCreateDialogOpen(false);
      setCreateFormData(emptyFormData);
      setFormErrors({});
      setFormError(null);
    }
    if (fetcher.data?.error) {
      setFormError(fetcher.data.error);
    }
  }, [fetcher.data]);

  const formatDate = (value: Date | string) => {
    const date = typeof value === 'string' ? new Date(value) : value;
    return new Intl.DateTimeFormat('nb-NO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };
  const formatTime = (dateString: string) => format(new Date(dateString), 'HH:mm');
  const formatDateTimeRange = (start: string, end: string) => {
    if (isSameDay(new Date(start), new Date(end))) {
      return `${formatDate(start)} ${formatTime(start)}–${formatTime(end)}`;
    }
    return `${formatDate(start)} ${formatTime(start)} – ${formatDate(end)} ${formatTime(end)}`;
  };
  const isWholeDay = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return (
      isSameDay(startDate, endDate) && format(startDate, 'HH:mm') === '00:00' && format(endDate, 'HH:mm') === '23:59'
    );
  };

  const totalRanges = schedules?.length ?? 0;
  const wholeDayRanges = schedules?.filter((range) => isWholeDay(range.startTime, range.endTime)).length ?? 0;
  const partialRanges = Math.max(totalRanges - wholeDayRanges, 0);
  const visibleSchedules = schedules?.slice(0, 5) ?? [];
  const rangeOptions = [
    { value: '30d', label: '30 dager', tone: 'future' },
    { value: '90d', label: '90 dager', tone: 'future' },
    { value: '6m', label: '6 måneder', tone: 'future' },
    { value: '12m', label: '12 måneder', tone: 'future' },
    { value: 'prev6m', label: 'Siste 6 måneder', tone: 'past' },
  ];
  const getRangeDates = (range: string, baseDate: Date) => {
    if (range === 'prev6m') {
      return { start: addMonths(baseDate, -6), end: baseDate };
    }
    if (range === '30d') return { start: baseDate, end: addDays(baseDate, 30) };
    if (range === '90d') return { start: baseDate, end: addDays(baseDate, 90) };
    if (range === '12m') return { start: baseDate, end: addMonths(baseDate, 12) };
    return { start: baseDate, end: addMonths(baseDate, 6) };
  };
  const { start: rangeStartDate, end: rangeEndDate } = getRangeDates(selectedRange, today);
  const futureOptions = rangeOptions.filter((option) => option.tone === 'future');
  const pastOptions = rangeOptions.filter((option) => option.tone === 'past');

  const handleFieldChange = (rangeId: string, field: keyof UnavailabilityRangeFormData, value: any) => {
    setCreateFormData((prev) => ({
      ranges: prev.ranges.map((range) => (range.id === rangeId ? { ...range, [field]: value } : range)),
    }));
    setFormErrors((prev) => ({
      ...prev,
      [rangeId]: { ...(prev[rangeId] || {}), [field]: undefined },
    }));
    setFormError(null);
  };

  const isSingleDayRange = (range: UnavailabilityRangeFormData) =>
    !!range.dateRange?.from && !!range.dateRange?.to && isSameDay(range.dateRange.from, range.dateRange.to);

  const getEffectiveTimes = (range: UnavailabilityRangeFormData) => {
    const isTodayRange = !!range.dateRange?.from && isSameDay(range.dateRange.from, new Date());
    const nextMinute = format(new Date(Date.now() + 60_000), 'HH:mm');
    const currentTime = format(new Date(), 'HH:mm');
    const normalizeStartTime = (value: string) => (isTodayRange && value <= currentTime ? nextMinute : value);

    if (!isSingleDayRange(range)) {
      const rangeStartTime = isTodayRange ? nextMinute : '00:00';
      return { startTime: normalizeStartTime(rangeStartTime), endTime: '23:59' };
    }

    const requestedStartTime = range.startTime || (isTodayRange ? nextMinute : '00:00');
    return { startTime: normalizeStartTime(requestedStartTime), endTime: range.endTime || '23:59' };
  };

  const validateRange = (range: UnavailabilityRangeFormData) => {
    const nextErrors: Partial<Record<'dateRange' | 'startTime' | 'endTime', string>> = {};
    if (!range.dateRange?.from || !range.dateRange?.to) {
      nextErrors.dateRange = 'Velg periode';
    }

    if (Object.keys(nextErrors).length > 0) {
      return { fieldErrors: nextErrors };
    }

    const { startTime, endTime } = getEffectiveTimes(range);
    const fromDate = new Date(`${format(range.dateRange!.from!, 'yyyy-MM-dd')}T${startTime}`);
    const toDate = new Date(`${format(range.dateRange!.to!, 'yyyy-MM-dd')}T${endTime}`);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return { fieldErrors: nextErrors, formError: 'Ugyldig dato eller tid' };
    }

    if (isSingleDayRange(range) && fromDate <= new Date()) {
      return { fieldErrors: nextErrors, formError: 'Starttid må være i fremtiden' };
    }
    if (fromDate >= toDate) {
      return { fieldErrors: nextErrors, formError: 'Sluttid må være etter starttid' };
    }

    return { fieldErrors: nextErrors };
  };

  const handleCreateSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, Partial<Record<'dateRange' | 'startTime' | 'endTime', string>>> = {};
    let nextFormError: string | null = null;

    createFormData.ranges.forEach((range) => {
      const { fieldErrors, formError: rangeError } = validateRange(range);
      if (Object.keys(fieldErrors).length > 0) {
        nextErrors[range.id] = fieldErrors;
      }
      if (rangeError && !nextFormError) nextFormError = rangeError;
    });

    if (Object.keys(nextErrors).length > 0 || nextFormError) {
      setFormErrors(nextErrors);
      setFormError(nextFormError);
      return;
    }

    const formData = new FormData();
    const rangesPayload = createFormData.ranges.map((range) => {
      const { startTime, endTime } = getEffectiveTimes(range);
      return {
        fromDate: format(range.dateRange!.from!, 'yyyy-MM-dd'),
        toDate: format(range.dateRange!.to!, 'yyyy-MM-dd'),
        startTime,
        endTime,
      };
    });
    formData.append('ranges', JSON.stringify(rangesPayload));

    fetcher.submit(formData, { method: 'post' });
  };

  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-[360px,1fr] gap-4">
        <Card variant="elevated">
          <CardHeader className="border-b">
            <CardTitle>Registrert fravær</CardTitle>
            <CardDescription>De neste fraværsperiodene dine.</CardDescription>
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Periode</span>
                <span>
                  {formatDate(rangeStartDate)} – {formatDate(rangeEndDate)}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-md border border-card-border bg-muted/30 px-3 py-2">
                  <p className="text-[11px] text-muted-foreground">Totalt</p>
                  <p className="text-sm font-medium text-foreground">{totalRanges}</p>
                </div>
                <div className="rounded-md border border-card-border bg-muted/30 px-3 py-2">
                  <p className="text-[11px] text-muted-foreground">Heldag</p>
                  <p className="text-sm font-medium text-foreground">{wholeDayRanges}</p>
                </div>
                <div className="rounded-md border border-card-border bg-muted/30 px-3 py-2">
                  <p className="text-[11px] text-muted-foreground">Med klokkeslett</p>
                  <p className="text-sm font-medium text-foreground">{partialRanges}</p>
                </div>
              </div>
              <div className="space-y-2 rounded-md border border-card-border bg-muted/20 p-3">
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Fremover</div>
                <div className="flex flex-wrap gap-2">
                  {futureOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      size="sm"
                      variant={selectedRange === option.value ? 'default' : 'outline'}
                      onClick={() => {
                        setSelectedRange(option.value);
                        const nextParams = new URLSearchParams(searchParams);
                        nextParams.set('range', option.value);
                        navigate({ search: `?${nextParams.toString()}` });
                      }}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Tidligere</div>
                <div className="flex flex-wrap gap-2">
                  {pastOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      size="sm"
                      variant={selectedRange === option.value ? 'secondary' : 'outline'}
                      className={
                        selectedRange === option.value
                          ? 'bg-muted text-foreground'
                          : 'border-muted-foreground/30 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                      }
                      onClick={() => {
                        setSelectedRange(option.value);
                        const nextParams = new URLSearchParams(searchParams);
                        nextParams.set('range', option.value);
                        navigate({ search: `?${nextParams.toString()}` });
                      }}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Viser {visibleSchedules.length} av {totalRanges}
                </div>
                <Button type="button" variant="default" size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Legg til fravær
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {visibleSchedules.length > 0 ? (
              visibleSchedules.map((schedule: ScheduleUnavailabilityDto, index: number) => {
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-lg border border-card-border bg-muted/30 p-3"
                  >
                    <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <CalendarOff className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-card-text truncate">
                        {formatDateTimeRange(schedule.startTime, schedule.endTime)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10">
                <div className="h-12 w-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
                  <CalendarOff className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">{error || 'Ingen fraværsperioder registrert'}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Legg til fravær
                </Button>
              </div>
            )}
            {schedules && schedules.length > 5 && (
              <Button variant="ghost" size="sm" className="w-full">
                Vis alle ({schedules.length})
              </Button>
            )}
          </CardContent>
        </Card>

        <Card variant="bordered" className="h-full">
          <CardHeader className="border-b">
            <CardTitle>Tips</CardTitle>
            <CardDescription>Husk å legge inn fravær i god tid.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3 rounded-lg border border-card-border bg-muted/30 p-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-foreground font-medium">Hold kalenderen oppdatert</p>
                <p className="text-xs text-muted-foreground">Nye tider blir ikke booket når du er fraværende.</p>
              </div>
            </div>
            <div className="rounded-lg border border-card-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                Vises her: {visibleSchedules.length} av {totalRanges}
              </p>
              <p className="text-sm text-foreground font-medium mt-1">Planlegg ferie og pauser tidlig</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <ScheduleUnavailabilityFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCancel={() => {
          setIsCreateDialogOpen(false);
          setCreateFormData(emptyFormData);
          setFormErrors({});
          setFormError(null);
        }}
        formData={createFormData}
        onSubmit={handleCreateSubmit}
        formErrors={formErrors}
        formError={formError}
        onFieldChange={handleFieldChange}
        onRemoveRange={(rangeId) => {
          setCreateFormData((prev) => ({
            ranges: prev.ranges.filter((item) => item.id !== rangeId),
          }));
        }}
        onAddRange={() => {
          setCreateFormData((prev) => ({
            ranges: [...prev.ranges, createEmptyRange()],
          }));
        }}
        isDatePickerOpen={isDatePickerOpen}
        setIsDatePickerOpen={setIsDatePickerOpen}
        activeRangeId={activeRangeId}
        setActiveRangeId={setActiveRangeId}
        isTimePickerOpen={isTimePickerOpen}
        setIsTimePickerOpen={setIsTimePickerOpen}
        activeTimePicker={activeTimePicker}
        setActiveTimePicker={setActiveTimePicker}
        today={today}
      />
    </>
  );
}
