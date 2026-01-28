import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { data, useNavigate, useSearchParams, useSubmit } from 'react-router';
import type { DateRange } from 'react-day-picker';
import { BellRing, Eye, Inbox } from 'lucide-react';
import type { Route } from './+types/company.notifications.route';
import { CompanyUserInAppNotificationController, type InAppNotificationDto } from '~/api/generated/notification';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { serializeQueryParams } from '~/lib/query';
import { ROUTES_MAP } from '~/lib/route-tree';
import { PageHeader } from '../_components/page-header';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Badge } from '~/components/ui/badge';
import { ServerPaginatedTable } from '~/components/table/server-side-table';
import { NotificationsFilterCard } from './_components/notifications-filter-card';
import { NotificationCardRow } from './_components/notification-card-row';
import { NotificationTableRow } from './_components/notification-table-row';
import { NotificationPaginationService } from './_utils/pagination-service';
import { parseNotificationListRequest } from './_utils/query';
import { parseIsoDate, toIsoDate } from '../timesheet/_utils';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const { filters, requestPayload } = parseNotificationListRequest(url);

  try {
    const response = await withAuth(request, () =>
      CompanyUserInAppNotificationController.getInAppNotifications({
        query: {
          request: requestPayload,
        },
        paramsSerializer: (params) => serializeQueryParams(params.request),
      }),
    );

    const pageData = response.data?.data;

    return data({
      notifications: pageData?.content ?? [],
      pagination: {
        page: pageData?.page ?? filters.page,
        size: pageData?.size ?? filters.size,
        totalElements: pageData?.totalElements ?? 0,
        totalPages: pageData?.totalPages ?? 1,
      },
      filters,
      error: null as string | null,
    });
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente varsler');
    return data({
      notifications: [] as InAppNotificationDto[],
      pagination: {
        page: filters.page,
        size: filters.size,
        totalElements: 0,
        totalPages: 1,
      },
      filters,
      error: message,
    });
  }
}

export default function CompanyNotificationsRoute({ loaderData }: Route.ComponentProps) {
  const { notifications, pagination, filters, error } = loaderData;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const submit = useSubmit();
  const formRef = useRef<HTMLFormElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fromDate, setFromDate] = useState(filters.fromDate ?? '');
  const [toDate, setToDate] = useState(filters.toDate ?? '');
  const [readFilter, setReadFilter] = useState(filters.read);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: parseIsoDate(filters.fromDate),
    to: parseIsoDate(filters.toDate),
  });

  const paginationService = useMemo(
    () => new NotificationPaginationService(searchParams, navigate),
    [searchParams, navigate],
  );

  useEffect(() => {
    setFromDate(filters.fromDate ?? '');
    setToDate(filters.toDate ?? '');
    setReadFilter(filters.read);
    setDateRange({
      from: parseIsoDate(filters.fromDate),
      to: parseIsoDate(filters.toDate),
    });
  }, [filters.fromDate, filters.toDate, filters.read]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const isViewed = (notification: InAppNotificationDto) => notification.readAt != null;

  const openNotificationRoute = (notification: InAppNotificationDto) => {
    const href = ROUTES_MAP['company.notifications.view'].href.replace(':id', notification.id.toString());
    const search = searchParams.toString();

    navigate(`${href}${search ? `?${search}` : ''}`);
  };

  const submitDebounced = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (!formRef.current) {
        return;
      }
      submit(formRef.current, { replace: true, preventScrollReset: true });
    }, 1000);
  };

  const handleRangeSelect = (nextRange: DateRange | undefined) => {
    setDateRange(nextRange);
    setFromDate(toIsoDate(nextRange?.from));
    setToDate(toIsoDate(nextRange?.to));
    submitDebounced();
  };

  const handleReadFilterChange = (value: 'all' | 'read' | 'unread') => {
    setReadFilter(value);
    submitDebounced();
  };

  const summary = useMemo(() => {
    return notifications.reduce(
      (acc, notification) => {
        acc.total += 1;
        if (isViewed(notification)) {
          acc.read += 1;
        } else {
          acc.unread += 1;
        }
        return acc;
      },
      { total: 0, read: 0, unread: 0 },
    );
  }, [notifications]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="In-app varsler"
        description="Varslene under er tilpasset den nye in-app DTO-en og viser emne, meldingstekst og lesestatus."
        teaser="Klikk på et varsel for å åpne hele meldingen i egen visning."
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-primary/20 bg-primary/5 px-3 py-1 text-primary">
              {pagination.totalElements} totalt
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              Side {pagination.page + 1} av {Math.max(pagination.totalPages, 1)}
            </Badge>
          </div>
        }
      >
        <div className="space-y-4">
          <NotificationsFilterCard
            formRef={formRef}
            fromDate={fromDate}
            toDate={toDate}
            dateRange={dateRange}
            readFilter={readFilter}
            pageSize={pagination.size}
            resetHref="/company/notifications"
            onRangeSelect={handleRangeSelect}
            onReadFilterChange={handleReadFilterChange}
          />
          {summary.unread > 0 && (
            <SummaryCard icon={<BellRing className="h-4 w-4 text-amber-600" />} label="Ulest" value={summary.unread} />
          )}
        </div>
      </PageHeader>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Kunne ikke hente varsler</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && (
        <ServerPaginatedTable<InAppNotificationDto>
          items={notifications}
          columns={[{ header: 'Tidspunkt' }, { header: 'Varsel' }, { header: 'Status' }]}
          pagination={pagination}
          onPageChange={paginationService.handlePageChange}
          onPageSizeChange={paginationService.handlePageSizeChange}
          emptyMessage="Ingen varsler funnet for valgte filtre."
          getRowKey={(notification) => notification.id}
          renderMobileCard={(notification) => (
            <NotificationCardRow
              notification={notification}
              isViewed={isViewed(notification)}
              onOpen={openNotificationRoute}
            />
          )}
          renderRow={(notification) => (
            <NotificationTableRow
              notification={notification}
              isViewed={isViewed(notification)}
              onOpen={openNotificationRoute}
            />
          )}
        />
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="inline-flex items-center gap-2.5 rounded-full border border-border/70 bg-background/80 px-3 py-2 shadow-xs">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">{icon}</div>
      <div className="leading-none">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}
