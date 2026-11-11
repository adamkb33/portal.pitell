import { Link, Outlet } from 'react-router';

import type { Route } from './+types/company.booking.layout';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { CompanyUserBookingController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const bookingInfoResponse = await withAuth(request, async () =>
      CompanyUserBookingController.getCompanyBookingInfo(),
    );

    return { bookingInfo: bookingInfoResponse.data?.data ?? null, error: null as string | null };
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente bookinginfo');
    return { bookingInfo: null, error: message };
  }
}

export default function CompanyBookingLayout({ loaderData }: Route.ComponentProps) {
  const data = loaderData.bookingInfo;

  const missingItems: Array<{ label: string; link: string; disabled?: boolean; reason?: string }> = [];
  if (data) {
    // Service groups (always first, never disabled)
    if (data.serviceGroupsAmount < 1) {
      missingItems.push({ label: 'tjenestegrupper', link: ROUTES_MAP['company.booking.admin.service-groups'].href });
    }

    // Services (disabled if no service groups)
    if (data.servicesAmount < 1) {
      missingItems.push({
        label: 'tjenester',
        link: ROUTES_MAP['company.booking.admin.services'].href,
        disabled: data.serviceGroupsAmount < 1,
        reason: 'Krever tjenestegrupper',
      });
    }

    // Booking profiles (always available)
    if (data.bookingProfilesAmount < 1) {
      missingItems.push({ label: 'bookingprofiler', link: ROUTES_MAP['company.booking.profile'].href });
    }

    // Profile services (disabled if no services)
    if (data.bookingProfileServicesAmount < 1) {
      missingItems.push({
        label: 'profiltjenester',
        link: ROUTES_MAP['company.booking.profile'].href,
        disabled: data.servicesAmount < 1,
        reason: 'Krever tjenester',
      });
    }

    // Daily schedules (disabled if no profile services)
    if (data.bookingProfileDailySchedulesAmount < 1) {
      missingItems.push({
        label: 'dagsplaner',
        link: ROUTES_MAP['company.booking.profile'].href,
        disabled: data.bookingProfileServicesAmount < 1,
        reason: 'Krever profiltjenester',
      });
    }
  }

  const showWarning = missingItems.length > 0;
  const completionPercentage = data ? Math.round(((5 - missingItems.length) / 5) * 100) : 0;

  return (
    <>
      {showWarning && (
        <div className="border border-foreground bg-primary/10 p-5 sm:p-6 mb-4 relative">
          {/* Progress indicator */}
          <div className="absolute top-0 left-0 h-1 bg-primary" style={{ width: `${completionPercentage}%` }} />

          <div className="flex items-start gap-4">
            <div className="text-4xl">🎯</div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider">Fullfør oppsettet</p>
                <p className="text-xs mt-1">
                  {completionPercentage}% fullført • {missingItems.length} gjenstående
                </p>
              </div>

              <div className="border-t-2 border-primary-foreground/20 pt-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider">Kompletter i rekkefølge:</p>
                <div className="flex flex-wrap gap-2">
                  {missingItems.map((item, index) => (
                    <div key={item.label} className="relative">
                      {item.disabled ? (
                        <div className="group relative border-2 border-border bg-muted text-muted-foreground px-4 py-2.5 text-xs font-bold rounded-none opacity-50 cursor-not-allowed">
                          <span className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-none bg-border text-xs font-bold text-muted">
                            {index + 1}
                          </span>
                          {item.label}
                          {item.reason && (
                            <span className="absolute -bottom-5 left-0 whitespace-nowrap text-xs text-muted-foreground">
                              {item.reason}
                            </span>
                          )}
                        </div>
                      ) : (
                        <Link
                          to={item.link}
                          className="group relative border-2 border-foreground bg-background text-foreground px-4 py-2.5 text-xs font-bold rounded-none hover:bg-foreground hover:text-background transition-colors"
                        >
                          <span className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-none bg-foreground text-xs font-bold text-background">
                            {index + 1}
                          </span>
                          {item.label}
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <Outlet />
      </div>
    </>
  );
}
