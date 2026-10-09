import { NavLink, useFetcher, useNavigate, useSearchParams } from 'react-router';
import { useMemo, useState } from 'react';
import { ServerPaginatedTable } from '~/components/table/server-side-table';
import { DeleteConfirmDialog } from '~/components/dialog/delete-confirm-dialog';
import { withAuth } from '~/api/utils/with-auth';
import { CompanyUserAppointmentController, type AppointmentDto } from '~/api/generated/booking';
import type { Route } from './+types/company.booking.appointments.route';
import { AppointmentCardRow } from './_components/appointment.card-row';
import { SpotlightAppointmentCard } from './_components/appointment.spotlight-card';
import { AppointmentTableHeaderSlot } from './_components/appointment.table-header-slot';
import { AppointmentTableRow } from './_components/appointment.table-row';
import { AppointmentPaginationService } from './_services/appointment.pagination-service';
import { resolveErrorPayload } from '~/lib/api-error';
import { redirectWithError, redirectWithSuccess } from '~/lib/flash-message.server';
import { formatCurrentDateTimeInTimeZone } from '~/lib/query';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { Button, CompanyPageTemplate, Label, Notice, Textarea } from '~/ui';
import { isAppointmentCompleted } from './_utils/appointments.utils';

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

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'delete') {
    const id = formData.get('id');
    const startTime = formData.get('startTime')?.toString();
    const reason = formData.get('reason')?.toString().trim();
    if (!id) {
      return redirectWithError(request, request.url, 'Mangler ID');
    }
    if (!startTime) {
      return redirectWithError(request, request.url, 'Mangler tidspunkt for avtalen');
    }
    if (!reason) {
      return redirectWithError(request, request.url, 'Skriv en årsak til slettingen');
    }
    if (isAppointmentCompleted({ startTime })) {
      return redirectWithError(request, request.url, 'Fullførte avtaler kan ikke slettes');
    }

    try {
      await withAuth(request, async () => {
        return CompanyUserAppointmentController.deleteAppointment({
          path: { id: Number(id) },
          body: { reason },
        });
      });

      return redirectWithSuccess(request, request.url, 'Timebestilling slettet');
    } catch (error) {
      const { message } = resolveErrorPayload(error, 'Kunne ikke slette timebestilling');
      return redirectWithError(request, request.url, message);
    }
  }

  return redirectWithError(request, request.url, 'Ukjent handling');
}

export default function CompanyBookingAppointmentsPage({ loaderData }: Route.ComponentProps) {
  const { appointments, pagination, error } = loaderData;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fetcher = useFetcher();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingAppointmentId, setDeletingAppointmentId] = useState<number | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const paginationService = useMemo(
    () => new AppointmentPaginationService(searchParams, navigate),
    [searchParams, navigate],
  );

  const now = useMemo(() => new Date(), [appointments]);
  const sortedByStart = useMemo(
    () => [...appointments].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [appointments],
  );

  const ongoingAppointment = useMemo(
    () => sortedByStart.find((appointment) => isAppointmentInProgress(appointment, now)) ?? null,
    [sortedByStart, now],
  );
  const lastCompletedAppointment = useMemo(
    () =>
      [...appointments]
        .filter((appointment) => isAppointmentPast(appointment, now))
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0] ?? null,
    [appointments, now],
  );
  const nextUpcomingAppointment = useMemo(
    () => sortedByStart.find((appointment) => new Date(appointment.startTime).getTime() >= now.getTime()) ?? null,
    [sortedByStart, now],
  );

  const handleDeleteClick = (id: number) => {
    const appointment = appointments.find((item) => item.id === id);
    if (!appointment || isAppointmentCompleted(appointment)) {
      return;
    }

    setDeletingAppointmentId(id);
    setDeleteReason('');
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!deletingAppointmentId) return;
    const trimmedReason = deleteReason.trim();
    if (!trimmedReason) {
      return;
    }
    const deletingAppointment = appointments.find((appointment) => appointment.id === deletingAppointmentId);
    if (!deletingAppointment) return;

    const fd = new FormData();
    fd.append('intent', 'delete');
    fd.append('id', String(deletingAppointmentId));
    fd.append('startTime', deletingAppointment.startTime);
    fd.append('reason', trimmedReason);

    setIsDeleteDialogOpen(false);
    fetcher.submit(fd, { method: 'post' });
  };

  const handleDeleteDialogOpenChange = (next: boolean) => {
    setIsDeleteDialogOpen(next);
    if (!next && fetcher.state === 'idle') {
      setDeletingAppointmentId(null);
      setDeleteReason('');
    }
  };

  const openAppointmentDetails = (appointment: AppointmentDto) => {
    if (!appointment.id) {
      return;
    }

    navigate(getAppointmentDetailHref(appointment.id));
  };

  return (
    <>
      <CompanyPageTemplate
        title="Timebestillinger"
        description="Hold oversikten over kommende og fullførte avtaler i den samme kompakte booking-layouten."
        routeLinks={
          <>
            <Button asChild variant="outline" size="sm">
              <NavLink to={ROUTES_MAP['company.booking'].href}>Oversikt</NavLink>
            </Button>
            <Button asChild variant="outline" size="sm">
              <NavLink to={ROUTES_MAP['company.booking.admin'].href}>Administrasjon</NavLink>
            </Button>
          </>
        }
        actions={
          <Button asChild>
            <NavLink to={ROUTES_MAP['company.booking.appointments.create'].href}>Ny time</NavLink>
          </Button>
        }
        hero={
          ongoingAppointment || lastCompletedAppointment || nextUpcomingAppointment ? (
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {ongoingAppointment ? (
                <SpotlightAppointmentCard
                  title="Pågående avtale"
                  hint="Pågår nå"
                  appointment={ongoingAppointment}
                  tone="ongoing"
                  onOpen={openAppointmentDetails}
                />
              ) : lastCompletedAppointment ? (
                <SpotlightAppointmentCard
                  title="Siste fullførte avtale"
                  hint="Sist gjennomført"
                  appointment={lastCompletedAppointment}
                  tone="recent"
                  onOpen={openAppointmentDetails}
                />
              ) : nextUpcomingAppointment ? (
                <SpotlightAppointmentCard
                  title="Neste avtale"
                  hint="Kommende"
                  appointment={nextUpcomingAppointment}
                  tone="upcoming"
                  onOpen={openAppointmentDetails}
                />
              ) : null}

              {ongoingAppointment && lastCompletedAppointment ? (
                <SpotlightAppointmentCard
                  title="Siste fullførte avtale"
                  hint="Sist gjennomført"
                  appointment={lastCompletedAppointment}
                  tone="recent"
                  onOpen={openAppointmentDetails}
                />
              ) : null}
            </div>
          ) : null
        }
      >
        {error ? (
          <Notice tone="emphasis" title="Kunne ikke hente timebestillinger" message={error} />
        ) : (
          <ServerPaginatedTable<AppointmentDto>
            items={appointments}
            columns={[
              { header: 'Tidspunkt', className: 'font-medium' },
              { header: 'Kunde' },
              { header: 'Tjenester' },
              { header: 'Varighet' },
              { header: 'Pris' },
              { header: 'Handlinger' },
            ]}
            pagination={pagination}
            scrollable={false}
            onPageChange={paginationService.handlePageChange}
            emptyMessage="Ingen avtaler ennå"
            getRowKey={(appointment, index) => appointment.id ?? `appointment-${index}`}
            renderMobileCard={(appointment, index) => (
              <AppointmentCardRow
                appointment={appointment}
                index={index}
                onOpen={openAppointmentDetails}
                onDelete={handleDeleteClick}
                isDeleting={fetcher.state !== 'idle' && deletingAppointmentId === appointment.id}
              />
            )}
            headerSlot={<AppointmentTableHeaderSlot />}
            mobileHeaderSlot={<AppointmentTableHeaderSlot />}
            renderRow={(appointment) => (
              <AppointmentTableRow
                appointment={appointment}
                onOpen={openAppointmentDetails}
                onDelete={handleDeleteClick}
                isDeleting={fetcher.state !== 'idle' && deletingAppointmentId === appointment.id}
              />
            )}
          />
        )}

        <DeleteConfirmDialog
          open={isDeleteDialogOpen}
          onOpenChange={handleDeleteDialogOpenChange}
          onConfirm={handleDeleteConfirm}
          title="Slett timebestilling?"
          description="Er du sikker på at du vil slette denne timebestillingen? Denne handlingen kan ikke angres."
          confirmDisabled={fetcher.state !== 'idle' || deleteReason.trim().length === 0}
        >
          <div className="grid gap-2">
            <Label htmlFor="delete-appointment-reason">Årsak til sletting</Label>
            <Textarea
              id="delete-appointment-reason"
              name="reason"
              size="sm"
              value={deleteReason}
              onChange={(event) => setDeleteReason(event.target.value)}
              placeholder="Skriv kort hvorfor avtalen slettes"
              className="rounded-md"
              disabled={fetcher.state !== 'idle'}
              required
            />
          </div>
        </DeleteConfirmDialog>
      </CompanyPageTemplate>
    </>
  );
}

export function getAppointmentDetailHref(appointmentId: number): string {
  return ROUTES_MAP['company.booking.appointments.detail'].href.replace(':appointmentId', String(appointmentId));
}

function isAppointmentInProgress(appointment: AppointmentDto, now: Date): boolean {
  const start = new Date(appointment.startTime).getTime();
  const end = new Date(appointment.endTime).getTime();
  const current = now.getTime();
  return current >= start && current <= end;
}

function isAppointmentPast(appointment: AppointmentDto, now: Date): boolean {
  return new Date(appointment.endTime).getTime() < now.getTime();
}
