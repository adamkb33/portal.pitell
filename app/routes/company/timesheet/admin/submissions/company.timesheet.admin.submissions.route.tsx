import { useEffect, useRef, useState } from 'react';
import { data, useSubmit } from 'react-router';
import type { DateRange } from 'react-day-picker';
import type { Route } from './+types/company.timesheet.admin.submissions.route';
import { AdminTimeSheetEntryController, type AdminEmployeeTimesheetEntriesDto } from '~/api/generated/timesheet';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { redirectWithSuccess, setFlashMessage } from '~/routes/company/_lib/flash-message.server';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Accordion } from '~/components/ui/accordion';
import { Card, CardContent } from '~/components/ui/card';
import { TimesheetPaginationFilterCard } from '~/routes/company/timesheet/_components/timesheet-pagination-filters';
import { SubmissionGroupCard } from './_components/submission-group-card';
import {
  parseIsoDate,
  parseTimesheetListRequest,
  serializeTimesheetQuery,
  TIMESHEET_SUBMITTED_STATUS_LABELS,
  toIsoDate,
} from '../../_utils';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const { requestPayload, statuses, page, size } = parseTimesheetListRequest(url);

  try {
    const response = await withAuth(request, () =>
      AdminTimeSheetEntryController.getEmployeeTimesheetEntries({
        query: { request: requestPayload },
        paramsSerializer: (params) => serializeTimesheetQuery(params.request),
      }),
    );

    return data({
      groups: response.data?.data ?? [],
      filters: {
        ...requestPayload,
        page,
        size,
        statuses,
      },
      error: null as string | null,
    });
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente innsendinger');
    return data({
      groups: [] as AdminEmployeeTimesheetEntriesDto[],
      filters: {
        ...requestPayload,
        page,
        size,
        statuses,
      },
      error: message,
    });
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent')?.toString() ?? '';

  if (intent !== 'accept-selected-users' && intent !== 'decline-selected-users') {
    const errorMessage = 'Ugyldig handling.';
    const flashCookie = await setFlashMessage(request, { type: 'error', text: errorMessage });
    return data({ error: errorMessage }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }

  const selectedEntryIds = formData
    .getAll('selectedEntryIds')
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (selectedEntryIds.length === 0) {
    const errorMessage = 'Velg minst én innlevert registrering.';
    const flashCookie = await setFlashMessage(request, { type: 'error', text: errorMessage });
    return data({ error: errorMessage }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }

  const declineReason = formData.get('reason')?.toString().trim() ?? '';
  if (intent === 'decline-selected-users' && !declineReason) {
    const errorMessage = 'Begrunnelse er påkrevd for avvisning.';
    const flashCookie = await setFlashMessage(request, { type: 'error', text: errorMessage });
    return data({ error: errorMessage }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }

  const url = new URL(request.url);
  const { requestPayload } = parseTimesheetListRequest(url);

  try {
    // Fetch current admin list with explicit SUBMITTED filter to get all actionable entry IDs.
    const listResponse = await withAuth(request, () =>
      AdminTimeSheetEntryController.getEmployeeTimesheetEntries({
        query: {
          request: {
            ...requestPayload,
            statuses: ['SUBMITTED'],
            page: 0,
            size: 1000,
          },
        },
        paramsSerializer: (params) => serializeTimesheetQuery(params.request),
      }),
    );

    const submittedIds = new Set(
      (listResponse.data?.data ?? [])
        .flatMap((group) => group.entries ?? [])
        .filter((entry) => entry.status === 'SUBMITTED' && typeof entry.id === 'number')
        .map((entry) => entry.id as number),
    );

    const entryIds = selectedEntryIds.filter((id) => submittedIds.has(id));

    if (entryIds.length === 0) {
      const errorMessage = 'Fant ingen innleverte registreringer for valgte registreringer.';
      const flashCookie = await setFlashMessage(request, { type: 'error', text: errorMessage });
      return data({ error: errorMessage }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
    }

    if (intent === 'accept-selected-users') {
      await withAuth(request, () =>
        AdminTimeSheetEntryController.acceptEntries({
          body: { entryIds },
        }),
      );

      return redirectWithSuccess(
        request,
        new URL(request.url).pathname + new URL(request.url).search,
        `Godkjente ${entryIds.length} innleverte registreringer.`,
      );
    }

    await withAuth(request, () =>
      AdminTimeSheetEntryController.declineEntries({
        body: {
          entryIds,
          reason: declineReason,
        },
      }),
    );

    return redirectWithSuccess(
      request,
      new URL(request.url).pathname + new URL(request.url).search,
      `Avviste ${entryIds.length} innleverte registreringer.`,
    );
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke oppdatere innsendinger');
    const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
    return data({ error: message }, { status: status ?? 400, headers: { 'Set-Cookie': flashCookie } });
  }
}

export default function CompanyTimesheetSubmissionsPage({ loaderData, actionData }: Route.ComponentProps) {
  const { groups, error, filters } = loaderData;
  const submit = useSubmit();
  const formRef = useRef<HTMLFormElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fromDate, setFromDate] = useState(filters.fromDate ?? '');
  const [toDate, setToDate] = useState(filters.toDate ?? '');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: parseIsoDate(filters.fromDate),
    to: parseIsoDate(filters.toDate),
  });
  const selectedStatuses = new Set(filters.statuses ?? []);

  useEffect(() => {
    setFromDate(filters.fromDate ?? '');
    setToDate(filters.toDate ?? '');
    setDateRange({
      from: parseIsoDate(filters.fromDate),
      to: parseIsoDate(filters.toDate),
    });
  }, [filters.fromDate, filters.toDate]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const submitDebounced = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (!formRef.current) {
        return;
      }
      submit(formRef.current, { replace: true });
    }, 1000);
  };

  const handleRangeSelect = (nextRange: DateRange | undefined) => {
    setDateRange(nextRange);
    setFromDate(toIsoDate(nextRange?.from));
    setToDate(toIsoDate(nextRange?.to));
    submitDebounced();
  };

  const statusOptions = [
    { value: 'SUBMITTED', label: TIMESHEET_SUBMITTED_STATUS_LABELS.SUBMITTED },
    { value: 'ACCEPTED', label: TIMESHEET_SUBMITTED_STATUS_LABELS.ACCEPTED },
    { value: 'DECLINED', label: TIMESHEET_SUBMITTED_STATUS_LABELS.DECLINED },
  ];

  return (
    <div className="space-y-4">
      <TimesheetPaginationFilterCard
        formRef={formRef}
        filters={filters}
        fromDate={fromDate}
        toDate={toDate}
        dateRange={dateRange}
        resetHref="/company/timesheets/admin/submissions"
        selectedStatuses={selectedStatuses}
        statusOptions={statusOptions}
        onRangeSelect={handleRangeSelect}
        onSubmitDebounced={submitDebounced}
      />

      {actionData && 'error' in actionData && (
        <Alert variant="destructive">
          <AlertTitle>Kunne ikke oppdatere</AlertTitle>
          <AlertDescription>{actionData.error}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Kunne ikke hente innsendinger</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && groups.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Ingen innsendinger funnet for valgte filtre.</p>
          </CardContent>
        </Card>
      )}

      {groups.length > 0 && (
        <Accordion type="multiple" className="space-y-3">
          {groups.map((group, index) => (
            <SubmissionGroupCard key={group.user.id ?? index} group={group} index={index} />
          ))}
        </Accordion>
      )}
    </div>
  );
}
