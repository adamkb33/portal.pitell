import { Outlet } from 'react-router';
import type { Route } from './+types/company.booking.schedule-unavailability.layout';
import { CompanyUserBookingProfileController } from '~/api/generated';
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
        'Du må opprette en bookingprofil før du kan legge til fravær.',
      );
    }

    return null;
  } catch (error) {
    return null;
  }
}

export default function CompanyBookingProfileScheduleUnavailabilityLayout() {
  return <Outlet />;
}
