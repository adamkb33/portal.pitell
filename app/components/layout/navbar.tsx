import { Link, NavLink } from 'react-router';
import { useLocation } from 'react-router';
import type { UserNavigation } from '~/lib/routing/route-tree';
import { BrachCategory, ROUTE_TREE, ROUTES_MAP, RoutePlaceMent } from '~/lib/routing/route-tree';
import type { CompanySummaryDto } from '~/api/generated';
import { ChevronLeft, Loader2, Menu } from 'lucide-react';
import PTLLogo from '../logos/PTL.logo';
import { NavbarNotificationBell } from './navbar-notification-bell';
import {
  getUserInitials,
  navbarIconButtonClassName,
  navbarOnBrandClassName,
  UserAvatar,
  type NavbarUserProfile,
} from './navbar-controls';
import { buildCrumbs, upCrumb, withTitle, withUpOverride, type Crumb } from '~/lib/routing/breadcrumbs';
import { crumbHref, useRememberSearch, useTitleOverride, useUpOverride } from '~/lib/routing/up-link';
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/ui';

export type NavbarProps = {
  navRoutes: UserNavigation | undefined;
  userProfile?: NavbarUserProfile;
  companyContext: CompanySummaryDto | null | undefined;
  hasSidebar?: boolean;
  onOpenSidebar?: () => void;
};

export function Navbar({ navRoutes, userProfile, companyContext, hasSidebar = false, onOpenSidebar }: NavbarProps) {
  const location = useLocation();
  const navigationBranches = navRoutes?.[RoutePlaceMent.NAVIGATION] || [];
  const sidebarBranches = navRoutes?.[RoutePlaceMent.SIDEBAR] || [];
  // The full tree keeps hidden pages (create, edit, invite), so the breadcrumb always names the current page.
  // A page that belongs to one record (Last opp bilde → its Timebestilling) adds it via `handle.up`; a page that shows
  // one record names itself via `handle.title` (a notification's page is "Ny timebestilling", not "Vis varsel").
  const upOverride = useUpOverride();
  const titleOverride = useTitleOverride();
  useRememberSearch();
  const crumbs = withTitle(
    withUpOverride(
      buildCrumbs(
        // The account pages (Min profil, Endre passord) aren't in the sidebar but still need their trail.
        ROUTE_TREE.filter(
          (branch) => branch.id === 'user' || sidebarBranches.some((sidebarBranch) => sidebarBranch.id === branch.id),
        ),
        location.pathname,
      ),
      upOverride,
    ),
    titleOverride,
  );
  // Phones: pages below a section show ‹ one level up instead of the menu (ui-rules → Page top). Desktop has the breadcrumb.
  const up = upCrumb(crumbs);
  const userBranches = navigationBranches.filter((branch) => branch.category === BrachCategory.USER);
  const authBranches = navigationBranches.filter((branch) => branch.category === BrachCategory.AUTH);
  const profileHref = userBranches.find((branch) => branch.id === 'user.profile')?.href;
  const canAccessNotifications = !!companyContext && hasBranch(sidebarBranches, 'company.notifications');
  const isLoggedInCompanyUser = !!companyContext;
  // No "Bestill time" button while the customer is already booking, or on a booking/loyalty detail page that has its
  // own book button. The "Mine bookinger" overview keeps it, since it is the only way to book from there.
  const bookingPath = ROUTES_MAP['booking.public.appointment'].href;
  const myAppointmentsPath = ROUTES_MAP['booking.public.my-appointments'].href;
  const isInBookingFlow =
    location.pathname === bookingPath ||
    location.pathname.startsWith(`${bookingPath}/`) ||
    location.pathname.startsWith(`${myAppointmentsPath}/`);

  return (
    <div className="flex h-full w-full min-w-0 items-center justify-between gap-3">
      <section className="flex min-w-0 flex-1 items-center">
        {hasSidebar ? (
          <div className="flex min-w-0 items-center gap-2">
            {/* On phones ≡ opens the drawer, which holds the menu, the company switcher and the account. */}
            {up ? (
              <Link
                to={crumbHref(up)}
                aria-label={`Tilbake til ${up.label}`}
                className={cn(navbarIconButtonClassName, navbarOnBrandClassName, '-ml-1.5 lg:hidden')}
              >
                <ChevronLeft className="size-6" aria-hidden />
              </Link>
            ) : onOpenSidebar ? (
              <button
                type="button"
                onClick={onOpenSidebar}
                className={cn(navbarIconButtonClassName, navbarOnBrandClassName, '-ml-1.5 lg:hidden')}
                aria-label="Åpne meny"
              >
                <Menu className="size-6" aria-hidden />
              </button>
            ) : null}
            <Breadcrumbs crumbs={crumbs} onBrand />
          </div>
        ) : (
          <Link to="/" className="flex h-full shrink-0 items-center text-xl font-semibold">
            <PTLLogo size="lg" />
          </Link>
        )}
      </section>

      <section className="flex w-max shrink-0 items-center justify-end gap-2">
        {canAccessNotifications ? <NavbarNotificationBell onBrand={hasSidebar} /> : null}

        {!isLoggedInCompanyUser && !isInBookingFlow && (
          <NavLink
            to={ROUTES_MAP['booking.public.appointment'].href}
            end
            className={({ isPending }) => (isPending ? 'pointer-events-none opacity-70' : undefined)}
          >
            {({ isPending }) => (
              <Button variant="primary" className="h-11">
                <span className="relative inline-flex items-center justify-center">
                  <span className={isPending ? 'opacity-60' : undefined}>Bestill time</span>
                  {isPending && (
                    <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                      <Loader2 className="size-4 animate-spin" />
                    </span>
                  )}
                </span>
              </Button>
            )}
          </NavLink>
        )}

        {hasSidebar ? null : userBranches.length > 0 ? (
          <div className="md:hidden">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label="Brukermeny" className={navbarIconButtonClassName}>
                  <UserAvatar userProfile={userProfile} />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="min-w-[220px] p-2">
                <UserMenuHeader userProfile={userProfile} profileHref={profileHref} />
                <DropdownMenuSeparator />
                {userBranches.length > 0 ? (
                  <>
                    {userBranches.map((link) => (
                      <DropdownMenuItem key={link.id} asChild className="min-h-11 rounded-lg px-3 py-3">
                        <Link to={link.href} className="cursor-pointer text-sm font-medium">
                          {link.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </>
                ) : null}

                {userBranches.length > 0 && authBranches.length > 0 ? <DropdownMenuSeparator /> : null}

                {authBranches.length > 0 ? (
                  <>
                    {userBranches.length === 0 ? <DropdownMenuLabel>Konto</DropdownMenuLabel> : null}
                    {authBranches.map((link) => (
                      <DropdownMenuItem key={link.id} asChild className="min-h-11 rounded-lg px-3 py-3">
                        <Link to={link.href} className="cursor-pointer text-sm font-medium text-text-secondary">
                          {link.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex items-center gap-2 md:hidden">
            {authBranches.map((link) => (
              <Button key={link.id} asChild variant="ghost" className="h-11 px-3 text-interactive">
                <Link to={link.href}>{link.label}</Link>
              </Button>
            ))}
          </div>
        )}

        {userBranches.length > 0 && !hasSidebar ? (
          // With a sidebar the account lives in it (desktop) or in the phone menu, so the header has no account menu.
          <div className="hidden md:flex">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label="Brukermeny" className={navbarIconButtonClassName}>
                  <UserAvatar userProfile={userProfile} />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="min-w-[180px]">
                <UserMenuHeader userProfile={userProfile} profileHref={profileHref} />
                <DropdownMenuSeparator />
                {userBranches.map((link) => (
                  <DropdownMenuItem key={link.id} asChild>
                    <Link to={link.href} className="cursor-pointer">
                      {link.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                {authBranches.length > 0 ? <DropdownMenuSeparator /> : null}
                {authBranches.map((link) => (
                  <DropdownMenuItem key={link.id} asChild>
                    <Link to={link.href} className="cursor-pointer text-text-secondary">
                      {link.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}

        {userBranches.length === 0 ? (
          <div className="hidden items-center gap-2 md:flex">
            {authBranches.map((link) => (
              <Link
                key={link.id}
                to={link.href}
                className="rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium text-text-secondary transition-colors duration-200 hover:bg-surface hover:text-text-primary"
              >
                {link.label}
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function UserMenuHeader({
  userProfile,
  profileHref,
}: {
  userProfile: NavbarProps['userProfile'];
  profileHref?: string;
}) {
  const fullName = [userProfile?.givenName, userProfile?.familyName].filter(Boolean).join(' ');
  const mobileNumber = userProfile?.mobileNumber?.replace(/^\+47\s*/, '');

  const content = (
    <>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-interactive text-sm font-bold text-text-inverse">
        {getUserInitials(userProfile)}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-text-primary">{fullName || 'Din konto'}</p>
        {userProfile?.email ? <p className="truncate text-xs text-text-secondary">{userProfile.email}</p> : null}
        {mobileNumber ? <p className="truncate text-xs text-text-secondary">{mobileNumber}</p> : null}
      </div>
    </>
  );

  if (profileHref) {
    return (
      <Link
        to={profileHref}
        className="flex min-w-0 items-center gap-3 rounded-[var(--radius-control)] px-2 py-2 transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive"
      >
        {content}
      </Link>
    );
  }

  return <div className="flex min-w-0 items-center gap-3 px-2 py-2">{content}</div>;
}

/**
 * `onBrand`: the company shell, where the bar is blue below `lg` (white text, the current page in the display font as
 * the title) and white from `lg`.
 */
function Breadcrumbs({ crumbs, onBrand = false }: { crumbs: Crumb[]; onBrand?: boolean }) {
  const current = cn(
    'truncate font-display font-semibold tracking-tight',
    onBrand ? 'text-[19px] text-on-brand lg:text-base lg:text-text-primary' : 'text-text-primary',
  );

  if (crumbs.length === 0) {
    return <span className={current}>Oversikt</span>;
  }

  return (
    <nav
      className={cn(
        'flex min-w-0 items-center gap-1.5 text-sm',
        onBrand ? 'text-on-brand-muted lg:text-text-secondary' : 'text-text-secondary',
      )}
      aria-label="Brødsmuler"
    >
      {crumbs.map((crumb, index) => {
        const isCurrent = index === crumbs.length - 1;

        return (
          <span
            key={`${crumb.href}-${index}`}
            // On phones only the current page shows; it doubles as the page title.
            className={cn('min-w-0 items-center gap-1.5', isCurrent ? 'flex' : 'hidden sm:flex')}
          >
            {index > 0 ? (
              <span
                className={cn(
                  'hidden sm:inline',
                  onBrand ? 'text-on-brand-muted/70 lg:text-text-disabled' : 'text-text-disabled',
                )}
              >
                /
              </span>
            ) : null}
            {isCurrent ? (
              <span className={current}>{crumb.label}</span>
            ) : (
              <Link
                to={crumbHref(crumb)}
                className={cn(
                  'truncate',
                  onBrand ? 'hover:text-on-brand lg:hover:text-text-primary' : 'hover:text-text-primary',
                )}
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function hasBranch(branches: UserNavigation[typeof RoutePlaceMent.SIDEBAR], id: string): boolean {
  for (const branch of branches) {
    if (branch.id === id) {
      return true;
    }

    if (branch.children && hasBranch(branch.children, id)) {
      return true;
    }
  }

  return false;
}
