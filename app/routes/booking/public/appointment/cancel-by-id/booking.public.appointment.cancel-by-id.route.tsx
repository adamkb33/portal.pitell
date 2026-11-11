import { data } from 'react-router';
import type { Route } from './+types/booking.public.appointment.cancel-by-id.route';
import { AppointmentsController, PublicAppointmentSessionController } from '~/api/generated';
import type { AppointmentDto, CompanySummaryDto } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { authService } from '~/lib/auth-service';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { redirectWithError, redirectWithSuccess } from '~/lib/flash-message.server';
import { CancelAppointmentGone, CancelAppointmentView } from '~/routes/booking/public/_components/cancel-appointment';
import { getBookingCompanySummary } from '~/routes/booking/public/_utils/booking-company.server';
import {
  buildAppointmentHref,
  formatCompanyAddress,
  getCompanyName,
} from '~/routes/booking/public/my-appointments/_utils/my-appointments.utils';

const MY_APPOINTMENTS_HREF = ROUTES_MAP['booking.public.my-appointments'].href;
export const APPOINTMENT_GONE_MESSAGE = 'Timen er allerede avbestilt';
export const CANCELLED_MESSAGE = 'Timen er avbestilt';

type LoaderData = {
  appointment: AppointmentDto | null;
  company: CompanySummaryDto | null;
  canCancel: boolean;
  error: string | null;
};

const nothing = (error: string): LoaderData => ({ appointment: null, company: null, canCancel: false, error });

function parseAppointmentId(value: string | undefined): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

const isNotFound = (error: unknown) => (error as { response?: { status?: number } })?.response?.status === 404;

// Returns null (rather than redirecting) when the appointment can't be found, so a stale
// link — e.g. the browser's back button after a cancel — lands on a calm "already cancelled" page
// instead of bouncing through a "not found" flash. The backend answers 404 both for an
// unknown id and for someone else's appointment, so a stranger sees the same page.
async function loadOwnedAppointment(request: Request, appointmentId: number): Promise<AppointmentDto | null> {
  const auth = await authService.getAuth(request);
  if (!auth) {
    throw await redirectWithError(request, ROUTES_MAP['auth.sign-in'].href, 'Du må logge inn for å avbestille time.');
  }

  try {
    const response = await withAuth(request, () =>
      PublicAppointmentSessionController.getAppointmentById({ query: { appointmentId } }),
    );
    const appointment = response.data?.data;
    return appointment && appointment.userId === auth.id ? appointment : null;
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const appointmentId = parseAppointmentId(params.appointmentId);
  if (!appointmentId) {
    return redirectWithError(request, MY_APPOINTMENTS_HREF, 'Ugyldig avtale-ID.');
  }

  try {
    const appointment = await loadOwnedAppointment(request, appointmentId);
    if (!appointment) {
      return data(nothing(APPOINTMENT_GONE_MESSAGE), { status: 404 });
    }

    const companyId = appointment.groupedServiceGroups[0]?.companyId;
    return data<LoaderData>({
      appointment,
      company: companyId ? await getBookingCompanySummary(companyId, request) : null,
      canCancel: new Date(appointment.startTime).getTime() > Date.now(),
      error: null,
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    const { status } = resolveErrorPayload(error, 'Kunne ikke hente timen');
    return data(nothing('Kunne ikke hente timen'), { status: status ?? 400 });
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const appointmentId = parseAppointmentId(params.appointmentId);
  if (!appointmentId) {
    return redirectWithError(request, MY_APPOINTMENTS_HREF, 'Ugyldig avtale-ID.');
  }

  try {
    const appointment = await loadOwnedAppointment(request, appointmentId);
    if (!appointment) {
      return redirectWithError(request, MY_APPOINTMENTS_HREF, APPOINTMENT_GONE_MESSAGE);
    }

    await withAuth(request, () => AppointmentsController.cancelMyAppointment({ path: { appointmentId } }));

    return redirectWithSuccess(request, MY_APPOINTMENTS_HREF, CANCELLED_MESSAGE);
  } catch (error) {
    if (error instanceof Response) throw error;
    const { message } = resolveErrorPayload(error, 'Kunne ikke avbestille timen. Prøv igjen.');
    return redirectWithError(request, MY_APPOINTMENTS_HREF, message);
  }
}

/** Avbestill time from "Mine bookinger": "Behold timen" goes back to the appointment's own page. */
export default function BookingPublicAppointmentCancelByIdRoute({ loaderData }: Route.ComponentProps) {
  const { appointment, company, canCancel, error } = loaderData;

  if (error || !appointment) {
    return (
      <CancelAppointmentGone
        title={error ?? APPOINTMENT_GONE_MESSAGE}
        href={MY_APPOINTMENTS_HREF}
        linkLabel="Mine bookinger"
      />
    );
  }

  return (
    <CancelAppointmentView
      appointment={appointment}
      companyName={company ? getCompanyName(company) : undefined}
      addressText={formatCompanyAddress(company)}
      canCancel={canCancel}
      backHref={buildAppointmentHref(appointment.id)}
      startedLinkLabel="Til timen"
    />
  );
}
