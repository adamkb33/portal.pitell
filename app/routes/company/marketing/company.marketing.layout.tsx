import { Outlet, type ShouldRevalidateFunctionArgs } from 'react-router';
import type { Route } from './+types/company.marketing.layout';
import { requireMarketingAdmin } from '~/lib/company-admin.server';

// Every marketing page (list, create, detail) needs MARKETING and ADMIN in the active company. This runs before every
// loader and action under this layout, so those don't check access again.
export const middleware: Route.MiddlewareFunction[] = [requireMarketingAdmin];

// Middleware only runs when the server is asked for data, so this loader makes every navigation re-check access.
export function loader() {
  return null;
}

// Re-check on every navigation and form submission, so losing the product or the role takes effect at once.
// The new-campaign live preview is the exception: it posts after every pause in typing, and the middleware checks
// that post itself.
export function shouldRevalidate({ formData }: Pick<ShouldRevalidateFunctionArgs, 'formData'>) {
  return formData?.get('intent') !== 'preview';
}

export default function CompanyMarketingLayout() {
  return <Outlet />;
}
