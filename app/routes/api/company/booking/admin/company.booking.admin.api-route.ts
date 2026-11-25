import type { Route } from './+types/company.booking.admin.api-route';
import { requireBookingAdmin } from '~/lib/company-admin.server';

// Every booking admin API route sits under this one, so this checks access before each of their actions.
export const middleware: Route.MiddlewareFunction[] = [requireBookingAdmin];
