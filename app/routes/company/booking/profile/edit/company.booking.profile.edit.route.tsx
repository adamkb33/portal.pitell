import type { FormPageHandle } from '~/lib/routing/create-action';
import type { Route } from './+types/company.booking.profile.edit.route';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { redirectWithInfo } from '~/lib/flash-message.server';
import { BookingProfileForm } from '../_components/booking-profile-form';
import { loadBookingProfileFormData, submitBookingProfileForm } from '../_lib/booking-profile-form.server';

export const handle: FormPageHandle = { formPage: true };

export async function loader({ request }: Route.LoaderArgs) {
  const result = await loadBookingProfileFormData(request);

  if (!result.error && !result.bookingProfile) {
    return redirectWithInfo(
      request,
      ROUTES_MAP['company.booking.profile.create'].href,
      'Du har ingen bookingprofil ennå. Opprett en ny profil først.',
    );
  }

  return result;
}

export async function action({ request }: Route.ActionArgs) {
  return submitBookingProfileForm(request);
}

export default function CompanyBookingProfileEditPage({ loaderData }: Route.ComponentProps) {
  return (
    <BookingProfileForm
      mode="edit"
      bookingProfile={loaderData.bookingProfile}
      groupedServiceGroups={loaderData.groupedServiceGroups}
      loaderError={loaderData.error}
    />
  );
}
