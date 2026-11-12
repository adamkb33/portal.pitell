import { Link, data, useFetcher } from 'react-router';
import { useState } from 'react';
import type { Route } from './+types/company.booking.appointments.detail.route';
import { CompanyUserAppointmentController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { DeleteConfirmDialog } from '~/components/dialog/delete-confirm-dialog';
import { resolveErrorPayload } from '~/lib/api-error';
import { redirectWithError, redirectWithSuccess } from '~/lib/flash-message.server';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { Button, cn, CompanyPageTemplate, Label, Textarea, PageNotice } from '~/ui';
import { AppointmentCard } from '../_components/appointment-card';
import { isBookingAdmin, setNoShowFromForm } from '../_services/appointment-admin.server';
import { isAppointmentCompleted } from '../_utils/appointments.utils';
import type { UpHandle } from '~/lib/routing/up-link';

export const handle: UpHandle = {
  up: (loaderData) => {
    const data = loaderData as { from?: string | null; returnTo?: string | null } | undefined;
    if (data?.from !== 'kalender') return null;

    const safeReturnTo = data.returnTo?.startsWith('/company/booking/schedule') ? data.returnTo : null;
    if (!safeReturnTo) return { label: 'Kalender', href: ROUTES_MAP['company.booking.schedule'].href };

    const returnUrl = new URL(safeReturnTo, 'http://localhost');
    return {
      label: 'Kalender',
      href: returnUrl.pathname,
      search: returnUrl.search,
    };
  },
};

export function parseAppointmentRouteId(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const appointmentId = parseAppointmentRouteId(params.appointmentId);

  if (!appointmentId) {
    return data({ appointment: null, notFound: true, error: 'Ugyldig timebestilling' }, { status: 400 });
  }

  try {
    const url = new URL(request.url);
    const from = url.searchParams.get('from') === 'kalender' ? 'kalender' : null;
    const requestedReturnTo = url.searchParams.get('returnTo');
    const returnTo = requestedReturnTo?.startsWith('/company/booking/schedule') ? requestedReturnTo : null;
    const response = await withAuth(request, () =>
      CompanyUserAppointmentController.getAppointmentById1({
        path: { id: appointmentId },
      }),
    );

    const appointment = response.data?.data ?? null;

    if (!appointment) {
      return data({ appointment: null, notFound: true, error: 'Fant ikke timebestillingen' }, { status: 404 });
    }

    return data({
      appointment,
      canMarkNoShow: await isBookingAdmin(request),
      from,
      returnTo,
      error: null as string | null,
    });
  } catch (error) {
    const { status, message } = resolveErrorPayload(error, 'Kunne ikke hente timebestilling');

    if (status === 401) {
      throw error;
    }

    if (status === 403) {
      return data(
        { appointment: null, notFound: true, error: 'Du har ikke tilgang til denne timebestillingen' },
        { status: 403 },
      );
    }

    // The backend answers an unknown id with 400 ("Appointment ikke funnet"); the id itself was checked above.
    if (status === 404 || status === 400) {
      return data({ appointment: null, notFound: true, error: 'Fant ikke timebestillingen' }, { status: 404 });
    }

    return data({ appointment: null, error: message }, { status: status ?? 400 });
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'no-show') {
    return setNoShowFromForm(request, formData);
  }

  if (intent !== 'delete') {
    return redirectWithError(request, request.url, 'Ukjent handling');
  }

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
    await withAuth(request, () =>
      CompanyUserAppointmentController.deleteAppointment({
        path: { id: Number(id) },
        body: { reason },
      }),
    );

    return redirectWithSuccess(request, ROUTES_MAP['company.booking.appointments'].href, 'Timebestilling slettet');
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke slette timebestilling');
    return redirectWithError(request, request.url, message);
  }
}

export default function CompanyBookingAppointmentDetailPage({ loaderData }: Route.ComponentProps) {
  const { appointment, error } = loaderData;
  const canMarkNoShow = 'canMarkNoShow' in loaderData && loaderData.canMarkNoShow;
  const fetcher = useFetcher();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  const isDeleting = fetcher.state !== 'idle';
  const isCompleted = appointment ? isAppointmentCompleted(appointment) : false;

  const handleToggleNoShow = () => {
    if (!appointment) return;
    const fd = new FormData();
    fd.append('intent', 'no-show');
    fd.append('id', String(appointment.id));
    fd.append('noShow', String(!appointment.noShow));
    fetcher.submit(fd, { method: 'post' });
  };

  const handleDeleteConfirm = () => {
    if (!appointment?.id || !deleteReason.trim()) {
      return;
    }

    const fd = new FormData();
    fd.append('intent', 'delete');
    fd.append('id', String(appointment.id));
    fd.append('startTime', appointment.startTime);
    fd.append('reason', deleteReason.trim());

    setIsDeleteDialogOpen(false);
    fetcher.submit(fd, { method: 'post' });
  };

  return (
    <CompanyPageTemplate title="Timebestilling">
      {error || !appointment ? (
        'notFound' in loaderData && loaderData.notFound ? (
          <PageNotice
            kind="not-found"
            title={error ?? 'Fant ikke timebestillingen'}
            message="Den kan være slettet."
            action={
              <Button asChild variant="outline">
                <Link to={ROUTES_MAP['company.booking.appointments'].href}>Til timebestillinger</Link>
              </Button>
            }
          />
        ) : (
          <PageNotice title="Kunne ikke hente timebestillingen" />
        )
      ) : (
        <>
          <section
            aria-label="Avtaledetaljer"
            className={cn(
              'w-full max-w-[32rem] rounded-xl border p-3 sm:p-4',
              appointment.noShow
                ? 'border-dashed border-border-strong bg-surface-variant-1'
                : 'border-border bg-background',
            )}
          >
            <AppointmentCard
              appointment={appointment}
              onDelete={isCompleted ? undefined : () => setIsDeleteDialogOpen(true)}
              isDeleting={isDeleting}
              onToggleNoShow={canMarkNoShow && isCompleted ? handleToggleNoShow : undefined}
              isTogglingNoShow={isDeleting}
            />
          </section>

          <DeleteConfirmDialog
            open={isDeleteDialogOpen}
            onOpenChange={(next) => {
              setIsDeleteDialogOpen(next);
              if (!next && fetcher.state === 'idle') {
                setDeleteReason('');
              }
            }}
            onConfirm={handleDeleteConfirm}
            title="Slett timebestilling?"
            description="Er du sikker på at du vil slette denne timebestillingen? Denne handlingen kan ikke angres."
            confirmDisabled={isDeleting || deleteReason.trim().length === 0}
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
                disabled={isDeleting}
                required
              />
            </div>
          </DeleteConfirmDialog>
        </>
      )}
    </CompanyPageTemplate>
  );
}
