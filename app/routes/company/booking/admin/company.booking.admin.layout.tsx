import { Outlet } from 'react-router';
import type { Route } from './+types/company.booking.admin.layout';
import { requireBookingAdmin } from '~/lib/company-admin.server';

// Runs before every loader and action under this layout, so those don't check access again.
export const middleware: Route.MiddlewareFunction[] = [requireBookingAdmin];

// Middleware only runs when the server is asked for data, so this always-revalidated loader makes every navigation
// within booking admin re-check access, even to a page without a loader.
export function loader() {
  return null;
}

export function shouldRevalidate() {
  return true;
}

export default function CompanyBookingAdminLayout() {
  return <Outlet />;
}
