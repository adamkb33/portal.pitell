import type { Route } from './+types/company.booking.profile.work-hours.route';
import type { FormPageHandle } from '~/lib/routing/create-action';
import { BookingProfileForm } from '../_components/booking-profile-form';
import { submitBookingProfileForm } from '../_lib/booking-profile-form.server';
export { loader } from '../edit/company.booking.profile.edit.route';

export const handle: FormPageHandle = { formPage: true };

export async function action({ request }: Route.ActionArgs) {
  return submitBookingProfileForm(request, 'schedule');
}

export default function Page({ loaderData }: Route.ComponentProps) {
  return <BookingProfileForm mode="edit" section="schedule" {...loaderData} loaderError={loaderData.error} />;
}
