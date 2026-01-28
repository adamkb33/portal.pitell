import { Link, Outlet } from 'react-router';

import type { Route } from './+types/company.booking.layout';
import { ROUTES_MAP } from '~/lib/route-tree';
import { CompanyUserBookingController } from '~/api/generated/booking';
import { resolveErrorPayload } from '~/lib/api-error';

export async function loader({ request: _request }: Route.LoaderArgs) {
  try {
    const bookingInfoResponse =
      await CompanyUserBookingController.getCompanyBookingInfo();

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
        link: ROUTES_MAP['company.booking.admin.service-groups.services'].href,
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
                <p className="text-sm font-bold uppercase tracking-[0.12em]">Fullfør oppsettet</p>
                <p className="text-xs mt-1">
                  {completionPercentage}% fullført • {missingItems.length} gjenstående
                </p>
              </div>

              <div className="border-t-2 border-primary-foreground/20 pt-3">
                <p className="text-xs font-medium mb-2 uppercase tracking-[0.12em]">Kompletter i rekkefølge:</p>
                <div className="flex flex-wrap gap-2">
                  {missingItems.map((item, index) => (
                    <div key={item.label} className="relative">
                      {item.disabled ? (
                        <div className="group relative border-2 border-border bg-muted text-muted-foreground px-4 py-2.5 text-xs font-bold rounded-none opacity-50 cursor-not-allowed">
                          <span className="absolute -top-1.5 -left-1.5 bg-border text-muted w-5 h-5 flex items-center justify-center text-[0.6rem] font-bold rounded-none">
                            {index + 1}
                          </span>
                          {item.label}
                          {item.reason && (
                            <span className="absolute -bottom-5 left-0 text-[0.65rem] text-muted-foreground whitespace-nowrap">
                              {item.reason}
                            </span>
                          )}
                        </div>
                      ) : (
                        <Link
                          to={item.link}
                          className="group relative border-2 border-foreground bg-background text-foreground px-4 py-2.5 text-xs font-bold rounded-none hover:bg-foreground hover:text-background transition-colors"
                        >
                          <span className="absolute -top-1.5 -left-1.5 bg-foreground text-background w-5 h-5 flex items-center justify-center text-[0.6rem] font-bold rounded-none">
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

      {loaderData.error && (
        <div className="border-2 border-destructive bg-destructive/10 p-4 mb-4">
          <p className="text-xs font-medium text-destructive">{loaderData.error}</p>
        </div>
      )}

      <div className="space-y-4">
      <Outlet />
      </div>
    </>
  );
}
