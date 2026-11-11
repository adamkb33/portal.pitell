import { CalendarDays, ClipboardList } from 'lucide-react';
import { useRouteLoaderData } from 'react-router';
import type { loader as rootLoader } from '~/routes/root.layout';
import { RoutePlaceMent } from '~/lib/routing/route-tree';
import { AreaSwitch } from '~/routes/_components/area-switch';
import { PageCreateButton } from '~/routes/_components/page-create-button';
import { cn } from '~/ui';

const DAILY_PAGES = [
  { id: 'company.booking.schedule', label: 'Kalender', icon: CalendarDays },
  { id: 'company.booking.appointments', label: 'Timebestillinger', icon: ClipboardList },
] as const;

/** Switches between the two daily booking pages without going back to the booking hub. */
export function BookingDailySwitch() {
  const rootData = useRouteLoaderData<typeof rootLoader>('routes/root.layout');
  const allowedChildren =
    rootData?.userNavigation?.[RoutePlaceMent.SIDEBAR]
      ?.find((branch) => branch.id === 'company')
      ?.children?.find((branch) => branch.id === 'company.booking')?.children ?? [];
  const pages = DAILY_PAGES.filter(({ id }) => allowedChildren.some((branch) => branch.id === id));

  if (pages.length < 2) return null;

  return (
    <AreaSwitch
      label="Bytt mellom kalender og timebestillinger"
      pages={pages.map(({ id, label, icon }) => ({ routeId: id, label, icon }))}
    />
  );
}

/**
 * The one toolbar for Kalender and Timebestillinger, so switching keeps everything in place:
 * the switch first, then the page's own controls, then Ny time on the right.
 */
export function BookingDailyToolbar({
  children,
  hideChildrenOnPhone = false,
}: {
  children?: React.ReactNode;
  /** The page shows its own controls on phones, so the toolbar row only appears from md up. */
  hideChildrenOnPhone?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <BookingDailySwitch />
      <div
        className={cn(
          'flex-1 items-center gap-2',
          children ? (hideChildrenOnPhone ? 'hidden md:flex' : 'flex') : 'hidden lg:flex',
        )}
      >
        {children}
        {/* The page's create action ("Ny time"); on phones the bottom menu's + does it instead. */}
        <PageCreateButton className="h-11 px-4" />
      </div>
    </div>
  );
}
