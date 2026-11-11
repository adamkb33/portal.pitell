import { useEffect, useRef, useState } from 'react';
import { data, useSubmit } from 'react-router';
import { ClipboardList, UserCheck, UserX } from 'lucide-react';
import type { Route } from './+types/company.timesheet.admin.submissions.route';
import { AdminTimeSheetEntryController, type AdminEmployeeTimesheetEntriesDto } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { redirectWithSuccess, setFlashMessage } from '~/lib/flash-message.server';
import { Accordion, CompanyEmptyState, CompanyPageTemplate, KpiCard, Notice } from '~/ui';
import { TimesheetPaginationFilterCard } from '~/routes/company/timesheet/_components/timesheet-pagination-filters';
import type { CalendarDateRange } from '~/ui';
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
  const [dateRange, setDateRange] = useState<CalendarDateRange | undefined>({
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

  const handleRangeSelect = (nextRange: CalendarDateRange | undefined) => {
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

  const summary = groups.reduce(
    (acc, group) => {
      acc.employees += 1;
      for (const entry of group.entries ?? []) {
        acc.total += 1;
        if (entry.status === 'SUBMITTED') acc.submitted += 1;
        if (entry.status === 'ACCEPTED') acc.accepted += 1;
        if (entry.status === 'DECLINED') acc.declined += 1;
      }
      return acc;
    },
    { employees: 0, total: 0, submitted: 0, accepted: 0, declined: 0 },
  );

  return (
    <CompanyPageTemplate
      title="Innsendinger"
      description="Oversikt over innsendte timeregistreringer fordelt per ansatt, i samme kompakte company-mønster som booking og admin."
      label="Timelister"
      hero={
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <KpiCard
            label="Ansatte"
            value={summary.employees}
            icon={<ClipboardList className="h-5 w-5" />}
            tone="primary"
          />
          <KpiCard
            label="Innsendt"
            value={summary.submitted}
            icon={<ClipboardList className="h-5 w-5" />}
            tone="warning"
          />
          <KpiCard label="Godkjent" value={summary.accepted} icon={<UserCheck className="h-5 w-5" />} tone="success" />
          <KpiCard label="Avvist" value={summary.declined} icon={<UserX className="h-5 w-5" />} tone="danger" />
        </div>
      }
    >
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

      {error ? (
        <Notice tone="emphasis" title="Kunne ikke hente innsendinger" message={error} />
      ) : groups.length === 0 ? (
        <CompanyEmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          title="Ingen innsendinger funnet"
          description="Det finnes ingen registreringer som matcher de valgte filtrene."
        />
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {groups.map((group, index) => (
            <SubmissionGroupCard key={group.user.id ?? index} group={group} index={index} />
          ))}
        </Accordion>
      )}
    </CompanyPageTemplate>
  );
}
