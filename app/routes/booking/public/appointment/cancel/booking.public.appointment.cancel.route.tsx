import { data } from 'react-router';
import type { Route } from './+types/booking.public.appointment.cancel.route';
import { PublicAppointmentSessionController, type AppointmentDto, type CompanySummaryDto } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { redirectWithError, redirectWithSuccess } from '~/lib/flash-message.server';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { CancelAppointmentGone, CancelAppointmentView } from '~/routes/booking/public/_components/cancel-appointment';
import { getBookingCompanySummary } from '~/routes/booking/public/_utils/booking-company.server';
import { decodeCancelAppointmentToken } from '~/routes/booking/public/_utils/cancel-appointment-token';
import {
  buildNewBookingHref,
  formatCompanyAddress,
  getCompanyName,
} from '~/routes/booking/public/my-appointments/_utils/my-appointments.utils';

/** Without a salon to go back to, "Bestill ny time" starts the booking flow from the top. */
const BOOKING_START_HREF = ROUTES_MAP['booking.public.appointment'].href;
const LINK_BROKEN = 'Lenken virker ikke';
const LINK_EXPIRED = 'Lenken har utløpt';
const APPOINTMENT_GONE = 'Timen er allerede avbestilt';
const CANCELLED = 'Timen er avbestilt';

type LoaderData = {
  appointment: AppointmentDto | null;
  company: CompanySummaryDto | null;
  canCancel: boolean;
  /** The link's token as it came in, sent back with the form. */
  cancelToken: string | null;
  error: string | null;
};

const nothing = (error: string): LoaderData => ({
  appointment: null,
  company: null,
  canCancel: false,
  cancelToken: null,
  error,
});

/** The backend token inside the email link, or why the link can't be used. */
function readCancelToken(cancelToken: string | null): { token: string } | { error: string } {
  const claims = cancelToken ? decodeCancelAppointmentToken(cancelToken) : null;
  if (!claims?.token) return { error: LINK_BROKEN };
  if (claims.expiresAt * 1000 < Date.now()) return { error: LINK_EXPIRED };
  return { token: claims.token };
}

/** The backend verifies the token's signature and expiry; the id inside it is never trusted here. */
async function loadAppointmentByToken(request: Request, token: string): Promise<AppointmentDto | null> {
  const response = await withAuth(request, () =>
    PublicAppointmentSessionController.getAppointmentByCancelToken({ query: { token } }),
  );
  return response.data?.data ?? null;
}

export async function loader({ request }: Route.LoaderArgs) {
  const cancelToken = new URL(request.url).searchParams.get('token');
  const read = readCancelToken(cancelToken);
  if ('error' in read) return data(nothing(read.error), { status: 400 });

  try {
    const appointment = await loadAppointmentByToken(request, read.token);
    if (!appointment) return data(nothing(APPOINTMENT_GONE), { status: 404 });

    const companyId = appointment.groupedServiceGroups[0]?.companyId;
    return data<LoaderData>({
      appointment,
      company: companyId ? await getBookingCompanySummary(companyId, request) : null,
      canCancel: new Date(appointment.startTime).getTime() > Date.now(),
      cancelToken,
      error: null,
    });
  } catch (error) {
    const { status } = resolveErrorPayload(error, 'Kunne ikke hente timen');
    // The link's shape and expiry are already checked above, and the backend deliberately answers a removed
    // appointment with the same "invalid link" error (4xx), so a 4xx here means it is already cancelled.
    const gone = status !== undefined && status >= 400 && status < 500;
    return data(nothing(gone ? APPOINTMENT_GONE : 'Kunne ikke hente timen'), { status: status ?? 500 });
  }
}

export async function action({ request }: Route.ActionArgs) {
  const url = new URL(request.url);
  const here = `${url.pathname}${url.search}`;
  const read = readCancelToken(String((await request.formData()).get('token') ?? '') || null);
  if ('error' in read) return redirectWithError(request, here, read.error);

  try {
    const appointment = await loadAppointmentByToken(request, read.token);
    if (!appointment) return redirectWithError(request, here, APPOINTMENT_GONE);

    await withAuth(request, () =>
      PublicAppointmentSessionController.cancelAppointment({ query: { token: read.token } }),
    );

    // Back to the salon, so booking a new time is one tap away.
    const salonHref = buildNewBookingHref(appointment.groupedServiceGroups[0]?.companyId);
    return redirectWithSuccess(request, salonHref ?? BOOKING_START_HREF, CANCELLED);
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke avbestille timen. Prøv igjen.');
    return redirectWithError(request, here, message);
  }
}

/** Avbestill time from the email link: the customer may have no account, so "Behold timen" goes to the salon. */
export default function BookingPublicAppointmentCancelRoute({ loaderData }: Route.ComponentProps) {
  const { appointment, company, canCancel, cancelToken, error } = loaderData;

  if (error || !appointment || !cancelToken) {
    return (
      <CancelAppointmentGone title={error ?? APPOINTMENT_GONE} href={BOOKING_START_HREF} linkLabel="Bestill ny time" />
    );
  }

  return (
    <CancelAppointmentView
      appointment={appointment}
      companyName={company ? getCompanyName(company) : undefined}
      addressText={formatCompanyAddress(company)}
      canCancel={canCancel}
      backHref={buildNewBookingHref(appointment.groupedServiceGroups[0]?.companyId) ?? BOOKING_START_HREF}
      startedLinkLabel="Bestill ny time"
      formFields={<input type="hidden" name="token" value={cancelToken} />}
    />
  );
}
