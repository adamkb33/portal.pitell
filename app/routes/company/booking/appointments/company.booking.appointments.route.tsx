import { useFetcher, useNavigate, useSearchParams } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ServerPaginatedTable } from '~/components/table/server-side-table';
import { DeleteConfirmDialog } from '~/components/dialog/delete-confirm-dialog';
import { withAuth } from '~/api/utils/with-auth';
import { CompanyUserAppointmentController, type AppointmentDto } from '~/api/generated/booking';
import type { Route } from './+types/company.booking.appointments.route';
import { AppointmentCardRow } from './_components/appointment.card-row';
import { AppointmentTableHeaderSlot } from './_components/appointment.table-header-slot';
import { AppointmentTableRow } from './_components/appointment.table-row';
import { AppointmentPaginationService } from './_services/appointment.pagination-service';
import { resolveErrorPayload } from '~/lib/api-error';
import { formatCurrentDateTimeInTimeZone } from '~/lib/query';

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '0', 10);
    const size = parseInt(url.searchParams.get('size') || '10', 10);
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
          size,
          ...(sort && { sort }),
          ...(search ? { search } : {}),
          ...(effectiveFromDateTime && { fromDateTime: effectiveFromDateTime }),
          ...(effectiveToDateTime && { toDateTime: effectiveToDateTime }),
          direction: direction || undefined,
        },
      });
    });

    console.log(appointmentsResponse.data?.data?.content);

    const apiResponse = appointmentsResponse.data;
    const pageData = apiResponse?.data;

    return {
      appointments: pageData?.content || [],
      pagination: {
        page: pageData?.page ?? 0,
        size: pageData?.size ?? size,
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
        size: 10,
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
    if (!id) {
      return { success: false, message: 'Mangler ID' };
    }

    try {
      await withAuth(request, async () => {
        return CompanyUserAppointmentController.deleteAppointment({
          path: { id: Number(id) },
        });
      });

      return { success: true, message: 'Timebestilling slettet' };
    } catch (error) {
      const { message } = resolveErrorPayload(error, 'Kunne ikke slette timebestilling');
      return {
        success: false,
        message,
      };
    }
  }

  return { success: false, message: 'Ukjent handling' };
}

export default function CompanyBookingAppointmentsPage({ loaderData }: Route.ComponentProps) {
  const { appointments, pagination } = loaderData;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fetcher = useFetcher<{ success?: boolean; message?: string }>();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingAppointmentId, setDeletingAppointmentId] = useState<number | null>(null);

  const paginationService = useMemo(
    () => new AppointmentPaginationService(searchParams, navigate),
    [searchParams, navigate],
  );

  useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) return;

    if (fetcher.data.success) {
      toast.success(fetcher.data.message ?? 'Handling fullført');
      setIsDeleteDialogOpen(false);
      setDeletingAppointmentId(null);
    } else if (fetcher.data.message) {
      toast.error(fetcher.data.message);
    }
  }, [fetcher.state, fetcher.data]);

  const handleDeleteClick = (id: number) => {
    setDeletingAppointmentId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!deletingAppointmentId) return;

    const fd = new FormData();
    fd.append('intent', 'delete');
    fd.append('id', String(deletingAppointmentId));

    fetcher.submit(fd, { method: 'post' });
  };

  return (
    <div className="container mx-auto">
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
        onPageChange={paginationService.handlePageChange}
        onPageSizeChange={paginationService.handlePageSizeChange}
        emptyMessage="Ingen avtaler ennå"
        getRowKey={(appointment, index) => appointment.id ?? `appointment-${index}`}
        renderMobileCard={(appointment) => (
          <AppointmentCardRow
            appointment={appointment}
            onDelete={handleDeleteClick}
            isDeleting={fetcher.state !== 'idle' && deletingAppointmentId === appointment.id}
          />
        )}
        headerSlot={<AppointmentTableHeaderSlot />}
        mobileHeaderSlot={<AppointmentTableHeaderSlot />}
        renderRow={(appointment) => (
          <AppointmentTableRow
            appointment={appointment}
            onDelete={handleDeleteClick}
            isDeleting={fetcher.state !== 'idle' && deletingAppointmentId === appointment.id}
          />
        )}
      />

      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Slett timebestilling?"
        description="Er du sikker på at du vil slette denne timebestillingen? Denne handlingen kan ikke angres."
      />
    </div>
  );
}
