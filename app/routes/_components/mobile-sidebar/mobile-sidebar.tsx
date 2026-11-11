import type { CSSProperties } from 'react';
import { Link, useLocation } from 'react-router';
import { Plus, X } from 'lucide-react';
import { getIcon } from '~/lib/routing/route-icon-map';
import type { RouteBranch } from '~/lib/routing/route-tree';
import { Button, cn, Sheet, SheetContent, SheetTitle } from '~/ui';
import type { NavbarUserProfile } from '~/components/layout/navbar-controls';
import { sectionCategory } from '~/components/layout/page-backgrounds';
import { buildSections, Sidebar, type SidebarWorkspace } from '../sidebar';
import { useAllowedCreateAction } from '../page-create-button';
import { DrawerAccount } from '../sidebar-account';

const BOTTOM_NAV_PRIORITY = ['company.overview', 'company.booking', 'company.timesheet', 'company.offer'];
const BOTTOM_NAV_MAX_ITEMS = 4;

type MobileSidebarProps = {
  branches: RouteBranch[];
  isOpen: boolean;
  onClose: () => void;
  workspace?: SidebarWorkspace | null;
  showBottomNav?: boolean;
  userProfile?: NavbarUserProfile;
  /** The flat account links (profile, my bookings, sign out) the desktop user menu shows. */
  navigationBranches?: RouteBranch[];
};

export function getBottomNavItems(branches: RouteBranch[]): RouteBranch[] {
  const items = buildSections(branches).flatMap((section) => [
    ...(section.overview ? [section.overview] : []),
    ...section.items,
  ]);
  const rank = (item: RouteBranch) => {
    const index = BOTTOM_NAV_PRIORITY.indexOf(item.id);
    return index === -1 ? BOTTOM_NAV_PRIORITY.length : index;
  };
  return [...items].sort((a, b) => rank(a) - rank(b)).slice(0, BOTTOM_NAV_MAX_ITEMS);
}

export function MobileSidebar({
  branches,
  isOpen,
  onClose,
  workspace,
  showBottomNav = true,
  userProfile,
  navigationBranches = [],
}: MobileSidebarProps) {
  const { pathname } = useLocation();
  const createAction = useAllowedCreateAction();
  const items = getBottomNavItems(branches);
  const activeItem = items
    .filter(
      (item) => pathname === item.href || (!item.id.endsWith('.overview') && pathname.startsWith(`${item.href}/`)),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];

  if (items.length === 0) return null;

  // Inside a domain the menu takes the domain's colour (Booking teal, Tilbud orange…); elsewhere it stays white with a
  // blue active tab. The active tab is the category tint with the category ink on it (≥ 4.5:1 for every category; a
  // stronger tint drops orange below that).
  const category = sectionCategory(pathname);
  const areaStyle = category
    ? ({
        '--area': `var(--color-category-${category})`,
        '--area-tint': `var(--color-category-${category}-tint)`,
        '--area-ink': `var(--color-category-${category}-ink)`,
      } as CSSProperties)
    : undefined;

  return (
    <>
      <Sheet
        open={isOpen}
        onOpenChange={(next) => {
          if (!next) onClose();
        }}
      >
        <SheetContent
          side="left"
          showCloseButton={false}
          aria-describedby={undefined}
          className="app-sidebar w-[min(20rem,85vw)] gap-0 overflow-hidden rounded-r-3xl border-0 px-3.5 pt-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-none outline-none lg:hidden"
        >
          <SheetTitle className="sr-only">Navigasjon</SheetTitle>
          <button
            type="button"
            onClick={onClose}
            aria-label="Lukk navigasjon"
            className="absolute top-3 right-2.5 z-10 grid size-11 place-items-center rounded-full text-chrome-text-muted transition-colors hover:bg-chrome-hover hover:text-chrome-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chrome-accent"
          >
            <X className="size-5" aria-hidden />
          </button>
          <Sidebar
            branches={branches}
            workspace={workspace}
            onNavigate={onClose}
            account={
              <DrawerAccount userProfile={userProfile} navigationBranches={navigationBranches} onNavigate={onClose} />
            }
          />
        </SheetContent>
      </Sheet>

      {showBottomNav ? (
        <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden" style={areaStyle}>
          {/* The page's create action (ui-rules, rule 4): a labelled button floating just above the menu, in the same
              place and shape as a form page's Lagre bar. Pages with nothing to create get none. */}
          {createAction ? (
            <div data-bottom-menu-create className="mx-auto max-w-md px-3 pb-2.5">
              <Button asChild size="lg" className="w-full shadow-(--shadow-floating)">
                <Link to={createAction.to}>
                  <Plus aria-hidden />
                  {createAction.label}
                </Link>
              </Button>
            </div>
          ) : null}
          <nav
            className={cn(
              'border-t px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2',
              category
                ? 'border-[color-mix(in_oklab,var(--area)_30%,var(--color-background))] bg-[color-mix(in_oklab,var(--area)_5%,var(--color-background))]'
                : 'border-border bg-background',
            )}
            aria-label="Mobil bunnnavigasjon"
          >
            <ul className="mx-auto flex max-w-[var(--container-xl)] gap-1.5">
              {items.map((item) => {
                const Icon = getIcon(item.iconName);
                const active = item.id === activeItem?.id;
                return (
                  <li key={item.id} className="min-w-0 flex-1">
                    {/* The active tab fills its whole cell with the area's colour (no small pill around the icon). */}
                    <Link
                      to={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive',
                        active
                          ? 'bg-[var(--area-tint,var(--color-surface-accent-strong))] font-semibold text-[var(--area-ink,var(--color-interactive))]'
                          : 'text-text-secondary hover:bg-[color-mix(in_oklab,var(--area,var(--color-interactive))_6%,transparent)] hover:text-text-primary',
                      )}
                    >
                      {Icon ? <Icon className="size-5.5" aria-hidden /> : null}
                      <span className="max-w-full truncate">{item.label ?? item.id}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      ) : null}
    </>
  );
}
