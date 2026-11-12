import { useNavigate, useSearchParams } from 'react-router';
import { useMemo, useState, type ReactNode } from 'react';
import { CalendarX, ChevronLeft, ChevronRight, History, SearchX } from 'lucide-react';
import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';
import { withAuth } from '~/api/utils/with-auth';
import { CompanyUserAppointmentController, type AppointmentDto } from '~/api/generated';
import type { Route } from './+types/company.booking.appointments.route';
import { AppointmentTableHeaderSlot } from './_components/appointment.table-header-slot';
import {
  AppointmentPaginationService,
  AppointmentPaginationQuickFilter,
} from './_services/appointment.pagination-service';
import { resolveErrorPayload } from '~/lib/api-error';
import { formatCurrentDateTimeInTimeZone } from '~/lib/query';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { Button, CompanyPageTemplate, PageNotice } from '~/ui';
import { BookingDailyToolbar } from '~/routes/company/booking/_components/booking-daily-switch';
import { isAppointmentCompleted, isAppointmentInProgress } from './_utils/appointments.utils';
import { AppointmentListRow } from './_components/appointment.list-row';
import type { CreateActionHandle } from '~/lib/routing/create-action';

export const handle = {
  createAction: {
    label: 'Bestill ny avtale',
    to: ROUTES_MAP['company.booking.appointments.create'].href,
    requires: 'company.booking.appointments',
  },
} satisfies CreateActionHandle;

const PAGE_SIZE = 5;

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '0', 10);
    const sort = url.searchParams.get('sort') || '';
    const search = url.searchParams.get('search')?.trim() || undefined;
    const fromDateTime = url.searchParams.get('fromDateTime');
    const toDateTime = url.searchParams.get('toDateTime');
    const direction = url.searchParams.get('direction') as 'ASC' | 'DESC' | null;

    const hasDateFilters = fromDateTime !== null || toDateTime !== null;
    const now = formatCurrentDateTimeInTimeZone();
    const effectiveFromDateTime = hasDateFilters ? fromDateTime : now;
    const effectiveToDateTime = hasDateFilters ? toDateTime : null;

    const appointmentsResponse = await withAuth(request, async () => {
      return CompanyUserAppointmentController.getAppointments({
        query: {
          page,
          size: PAGE_SIZE,
          ...(sort && { sort }),
          ...(search ? { search } : {}),
          ...(effectiveFromDateTime && { fromDateTime: effectiveFromDateTime }),
          ...(effectiveToDateTime && { toDateTime: effectiveToDateTime }),
          direction: direction || 'ASC',
        },
      });
    });

    const apiResponse = appointmentsResponse.data;
    const pageData = apiResponse?.data;

    return {
      appointments: pageData?.content || [],
      pagination: {
        page: pageData?.page ?? 0,
        size: PAGE_SIZE,
        totalElements: pageData?.totalElements ?? 0,
        totalPages: pageData?.totalPages ?? 1,
      },
    };
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente timebestillinger');
    return {
      appointments: [],
      pagination: {
        page: 0,
        size: PAGE_SIZE,
        totalElements: 0,
        totalPages: 1,
      },
      error: message,
    };
  }
}

export default function CompanyBookingAppointmentsPage({ loaderData }: Route.ComponentProps) {
  const { appointments, pagination, error } = loaderData;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paginationService = useMemo(
    () => new AppointmentPaginationService(searchParams, navigate),
    [searchParams, navigate],
  );

  const [now] = useState(() => new Date());
  const dayGroups = useMemo(() => {
    const groups = new Map<string, { key: string; label: string; items: AppointmentDto[] }>();
    for (const appointment of appointments) {
      const date = parseISO(appointment.startTime);
      const key = format(date, 'yyyy-MM-dd');
      if (!groups.has(key)) {
        const dayName = format(date, 'EEEE d. MMM', { locale: nb });
        const prefix = isToday(date)
          ? 'I dag · '
          : isTomorrow(date)
            ? 'I morgen · '
            : isYesterday(date)
              ? 'I går · '
              : '';
        groups.set(key, { key, label: `${prefix}${dayName}`, items: [] });
      }
      groups.get(key)!.items.push(appointment);
    }
    return Array.from(groups.values());
  }, [appointments]);
  // "Neste" is the first appointment still to come, shown on the first page only.
  const nextAppointmentId =
    pagination.page === 0
      ? appointments.find((appointment) => !isAppointmentCompleted(appointment, now))?.id
      : undefined;

  const searchTerm = searchParams.get('search');
  const hasDateFilter =
    paginationService.getActiveQuickFilter() !== AppointmentPaginationQuickFilter.UPCOMING ||
    Boolean(searchParams.get('toDateTime'));
  const isPast = paginationService.getActiveQuickFilter() === AppointmentPaginationQuickFilter.PAST;
  const empty: { title: string; help: string; action: ReactNode } = searchTerm
    ? {
        title: `Ingen treff på «${searchTerm}»`,
        help: 'Sjekk stavemåten, eller søk på telefonnummer.',
        action: (
          <Button variant="outline" onClick={() => paginationService.handleRemoveFilter('search')}>
            Tøm søk
          </Button>
        ),
      }
    : hasDateFilter && !isPast
      ? {
          title: 'Ingen avtaler i denne perioden',
          help: 'Prøv en annen periode, eller fjern filteret.',
          action: (
            <Button variant="outline" onClick={() => paginationService.handleUpcomingFilter()}>
              Fjern filter
            </Button>
          ),
        }
      : isPast
        ? { title: 'Ingen tidligere avtaler', help: 'Fullførte avtaler vises her.', action: null }
        : {
            title: 'Ingen kommende avtaler',
            help: 'Nye bestillinger dukker opp her så fort de kommer inn.',
            // No button here: the page's create button ("Bestill ny avtale") already does that (ui-rules, rule 7).
            action: null,
          };
  const EmptyIcon = searchTerm ? SearchX : isPast ? History : CalendarX;

  return (
    <CompanyPageTemplate title="Timebestillinger">
      <BookingDailyToolbar />
      {error ? (
        <PageNotice title="Kunne ikke hente timebestillinger" />
      ) : (
        <div>
          <section
            aria-label="Timebestillingsliste"
            className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-background"
          >
            <div className="border-b border-border p-4 sm:p-5">
              <AppointmentTableHeaderSlot />
            </div>
            <div className={appointments.length ? 'flex-1' : 'hidden'}>
              {dayGroups.map((group) => (
                <section key={group.key} aria-label={group.label}>
                  <h3 className="flex items-center justify-between gap-3 border-y border-border bg-slate-100 px-4 py-1.5 text-xs font-semibold text-text-primary first:border-t-0 sm:px-5">
                    <span className="first-letter:uppercase">{group.label}</span>
                    <span className="font-normal text-text-secondary">
                      {group.items.length} {group.items.length === 1 ? 'avtale' : 'avtaler'}
                    </span>
                  </h3>
                  <ul className="divide-y divide-border">
                    {group.items.map((appointment) => (
                      <li key={appointment.id}>
                        <AppointmentListRow
                          appointment={appointment}
                          href={getAppointmentDetailHref(appointment.id)}
                          marker={
                            isAppointmentInProgress(appointment, now)
                              ? 'now'
                              : appointment.id === nextAppointmentId
                                ? 'next'
                                : new Date(appointment.endTime) < now
                                  ? 'past'
                                  : null
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            {!appointments.length && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-interactive">
                  <EmptyIcon className="h-7 w-7" aria-hidden="true" />
                </span>
                <div className="grid gap-1">
                  <p className="text-base font-semibold text-text-primary">{empty.title}</p>
                  <p className="text-sm text-text-secondary">{empty.help}</p>
                </div>
                {empty.action}
              </div>
            )}
            <div
              className={`${pagination.totalElements > 0 ? 'flex' : 'hidden'} flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-text-secondary sm:px-5`}
            >
              {pagination.totalElements > 0 && (
                <span>
                  {pagination.totalElements.toLocaleString('nb-NO')}{' '}
                  {pagination.totalElements === 1 ? 'avtale' : 'avtaler'}
                </span>
              )}
              <div className={`flex items-center gap-2 ${pagination.totalPages > 1 ? '' : 'hidden'}`}>
                <span>
                  Side {pagination.page + 1} av {Math.max(1, pagination.totalPages)}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Forrige side"
                  disabled={pagination.page === 0}
                  onClick={() => paginationService.handlePageChange(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Neste side"
                  disabled={pagination.page + 1 >= pagination.totalPages}
                  onClick={() => paginationService.handlePageChange(pagination.page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}
    </CompanyPageTemplate>
  );
}

export function getAppointmentDetailHref(appointmentId: number): string {
  return ROUTES_MAP['company.booking.appointments.detail'].href.replace(':appointmentId', String(appointmentId));
}
