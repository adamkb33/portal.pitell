import * as React from 'react';
import { Outlet, useRouteError, isRouteErrorResponse } from 'react-router';
import { Menu } from 'lucide-react';

import { Navbar } from '~/components/layout/navbar';
import { type UserNavigation, RoutePlaceMent } from '~/lib/route-tree';
import { Sidebar } from './_components/sidebar';
import { MobileSidebar } from './_components/mobile-sidebar';
import type { Route } from './+types/root.layout';
import { authService, AuthenticationError } from '~/lib/auth-service';
import { logger } from '~/lib/logger';
import { defaultResponse, refreshAndBuildResponse, buildResponseData } from './_features/root.loader';
import { getFlashMessage } from './company/_lib/flash-message.server';
import { FlashMessageBanner } from './_components/flash-message-banner';
import { Button } from '~/components/ui/button';
import { Footer } from './_components/footer';
import type { CompanySummaryDto } from '~/api/generated/identity';

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const { message: flashMessage } = await getFlashMessage(request);
    const { accessToken, refreshToken } = await authService.getTokensFromRequest(request);

    if (!accessToken && !refreshToken) {
      return await defaultResponse(flashMessage);
    }

    if (!accessToken && refreshToken) {
      return await refreshAndBuildResponse(request, refreshToken, flashMessage);
    }

    if (accessToken) {
      if (authService.isTokenExpired(accessToken)) {
        if (refreshToken) {
          return await refreshAndBuildResponse(request, refreshToken, flashMessage);
        }
        return await defaultResponse(flashMessage);
      }
      return await buildResponseData(request, accessToken, flashMessage);
    }

    return await defaultResponse(flashMessage);
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    logger.error('Root loader failed', { error: error instanceof Error ? error.message : String(error) });
    if (error instanceof AuthenticationError) {
      return await defaultResponse(null);
    }

    throw error;
  }
}

export type RootOutletContext = {
  userNav: UserNavigation;
  setUserNav: React.Dispatch<React.SetStateAction<UserNavigation | undefined>>;
  companyContext: CompanySummaryDto | null | undefined;
  setCompanyContext: React.Dispatch<React.SetStateAction<CompanySummaryDto | null | undefined>>;
};

export default function RootLayout({ loaderData }: Route.ComponentProps) {
  const [userNav, setUserNav] = React.useState<UserNavigation | undefined>(undefined);
  const [companyContext, setCompanyContext] = React.useState<CompanySummaryDto | null | undefined>(undefined);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    setUserNav(loaderData.userNavigation || undefined);
    setCompanyContext(loaderData.companyContext);
  }, [loaderData]);

  const sidebarBranches = userNav?.[RoutePlaceMent.SIDEBAR] || [];
  const hasSidebar = sidebarBranches.length > 0 && companyContext;

  return (
    <div className="app-shell">
      <FlashMessageBanner message={loaderData.flashMessage} />

      <header className="app-header">
        <div className="app-header-grid">
          <div className="app-header-spacer" />

          <nav className="app-header-nav">
            <div className="app-header-row">
              {hasSidebar && (
                <Button
                  variant="ghost"
                  onClick={() => setMobileMenuOpen(true)}
                  className="lg:hidden h-10 w-10 flex items-center justify-center text-navbar-accent-foreground border-navbar-border"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              )}

              <div className="flex-1 flex items-center h-full">
                <Navbar
                  navRoutes={userNav}
                  companyContext={companyContext}
                  notifications={loaderData.navbarNotifications}
                />
              </div>
            </div>
          </nav>

          <div className="app-header-spacer" />
        </div>
      </header>

      {/* Main — stretches between header and footer */}
      <main className="app-main">
        {/* Desktop Sidebar */}
        {hasSidebar ? (
          <aside className="app-sidebar">
            <Sidebar branches={sidebarBranches} />
          </aside>
        ) : (
          <aside className="app-sidebar-placeholder" />
        )}

        {/* Mobile Sidebar Overlay */}
        {hasSidebar && (
          <MobileSidebar branches={sidebarBranches} isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        )}

        {/* Content — THIS is the scroll container */}
        <section className="app-content">
          <Outlet
            context={{
              userNav,
              setUserNav,
              companyContext,
              setCompanyContext,
            }}
          />
        </section>

        <div className="app-sidebar-placeholder" />
      </main>

      {/* Footer — fixed height */}
      <footer className="app-footer">
        <Footer />
      </footer>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  logger.error('Route error boundary', { error });

  if (isRouteErrorResponse(error)) {
    return (
      <div className="app-shell">
        <main className="app-main">
          <section className="app-content p-6">
            <h1 className="text-xl font-semibold">Noe gikk galt</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {error.status} {error.statusText}
            </p>
          </section>
        </main>
      </div>
    );
  }

  const message = error instanceof Error ? error.message : 'Ukjent feil';
  return (
    <div className="app-shell">
      <main className="app-main">
        <section className="app-content p-6">
          <h1 className="text-xl font-semibold">Noe gikk galt</h1>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        </section>
      </main>
    </div>
  );
}
