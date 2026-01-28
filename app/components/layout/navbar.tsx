import { Link, NavLink } from 'react-router';
import type { UserNavigation } from '~/lib/route-tree';
import { RoutePlaceMent, BrachCategory, ROUTES_MAP } from '~/lib/route-tree';
import type { CompanySummaryDto } from '~/api/generated/identity';
import CompanyHeader from './company-header';
import { Loader2, Menu, User } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import BiTLogo from '../logos/BiT.logo';
import { NavbarNotificationBell } from './navbar-notification-bell';
import type { NavbarNotificationsData } from '~/routes/_features/root.loader';

export type NavbarProps = {
  navRoutes: UserNavigation | undefined;
  companyContext: CompanySummaryDto | null | undefined;
  notifications: NavbarNotificationsData | null;
};

export function Navbar({ navRoutes, companyContext, notifications }: NavbarProps) {
  const navigationBranches = navRoutes?.[RoutePlaceMent.NAVIGATION] || [];
  const sidebarBranches = navRoutes?.[RoutePlaceMent.SIDEBAR] || [];
  const userBranches = navigationBranches.filter((branch) => branch.category === BrachCategory.USER);
  const authBranches = navigationBranches.filter((branch) => branch.category === BrachCategory.AUTH);
  const hasMobileMenuLinks = userBranches.length > 0 || authBranches.length > 0;
  const canAccessCompanyContext = navigationBranches.some((branch) => branch.id === 'user.company-context');
  const canAccessNotifications = !!companyContext && hasBranch(sidebarBranches, 'company.notifications');
  const isLoggedInCompanyUser = !!companyContext;

  return (
    <div className="flex h-full items-center justify-between w-full">
      <div className="flex h-full items-center gap-6">
        <Link to="/" className="flex items-center h-full text-xl font-semibold">
          <BiTLogo size="xl" onDark />
        </Link>
        <CompanyHeader company={companyContext} canAccessCompanyContext={canAccessCompanyContext} />
      </div>

      <div className="flex items-center gap-4 h-full">
        {!isLoggedInCompanyUser && (
          <NavLink
            to={ROUTES_MAP['booking.public.appointment'].href}
            end
            className={({ isPending }) => (isPending ? 'pointer-events-none opacity-70' : undefined)}
          >
            {({ isPending }) => (
              <Button className="h-11 rounded-md border border-button-primary-border bg-button-primary-bg px-4 text-sm font-semibold text-button-primary-text transition-all duration-200 hover:bg-button-primary-hover-bg hover:text-button-primary-hover-text">
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

        {canAccessNotifications && notifications && (
          <NavbarNotificationBell items={notifications.items} hasUnread={notifications.hasUnread} />
        )}

        {hasMobileMenuLinks && (
          <div className="md:hidden">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Meny"
                  className="h-11 w-11 rounded-md border border-navbar-border bg-navbar-icon-bg text-navbar-text hover:bg-navbar-accent hover:border-primary hover:text-primary transition-all duration-200"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="min-w-[220px] p-4">
                <div className="space-y-4">
                  {userBranches.length > 0 && (
                    <div className="space-y-2">
                      {userBranches.map((link) => (
                        <DropdownMenuItem key={link.id} asChild className="px-3 py-3">
                          <Link to={link.href} className="cursor-pointer text-sm font-medium">
                            {link.label}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  )}

                  {authBranches.length > 0 && (
                    <div className="space-y-2">
                      {authBranches.map((link) => (
                        <DropdownMenuItem key={link.id} asChild className="px-3 py-3">
                          <Link to={link.href} className="cursor-pointer text-sm font-medium text-navbar-text-muted">
                            {link.label}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <div className="hidden md:flex">
          {userBranches.length > 0 && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="User menu"
                  className="h-11 w-11 rounded-md border border-navbar-border bg-navbar-icon-bg text-navbar-text hover:bg-navbar-accent hover:border-primary hover:text-primary transition-all duration-200"
                >
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="min-w-[180px]">
                {userBranches.map((link) => (
                  <DropdownMenuItem key={link.id} asChild>
                    <Link to={link.href} className="cursor-pointer">
                      {link.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="hidden md:flex items-center gap-2">
          {authBranches.map((link) => (
            <Link
              key={link.id}
              to={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-navbar-text-muted transition-all duration-200 hover:bg-navbar-accent hover:text-navbar-text"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
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
