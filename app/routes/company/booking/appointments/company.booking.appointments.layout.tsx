import { Outlet } from 'react-router';
import type { Route } from './+types/company.booking.appointments.layout';
import { CompanyUserBookingProfileController, type ApiMessage } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { redirectWithInfo } from '~/lib/flash-message.server';
import { ROUTES_MAP } from '~/lib/routing/route-tree';

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const profile = await withAuth(request, async () => {
      return CompanyUserBookingProfileController.getBookingProfile();
    });

    if (!profile?.data) {
      return redirectWithInfo(
        request,
        ROUTES_MAP['company.booking.profile'].href,
        'Du må opprette en bookingprofil før du kan administrere timebestillinger.',
      );
    }

    return null;
  } catch (error) {
    const apiMessage = (error as { response?: { data?: { message?: ApiMessage } } })?.response?.data?.message;
    if (apiMessage?.id === 'BOOKING_PROFILE_REQUIRED') {
      return redirectWithInfo(request, ROUTES_MAP['company.booking.profile'].href, apiMessage);
    }

    return null;
  }
}

export default function CompanyBookingAdminAppointmentsLayout() {
  return <Outlet />;
}
