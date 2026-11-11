import * as React from 'react';
import { Link, Outlet, data, isRouteErrorResponse, useLocation, useRouteError } from 'react-router';
import { AlertTriangle, ArrowLeft, CloudOff, Home, RefreshCw, SearchX } from 'lucide-react';

import { Navbar } from '~/components/layout/navbar';
import { type UserNavigation, RoutePlaceMent } from '~/lib/routing/route-tree';
import { Sidebar } from './_components/sidebar';
import { SidebarAccountMenu } from './_components/sidebar-account';
import { MobileSidebar } from './_components/mobile-sidebar/mobile-sidebar';
import { useAllowedCreateAction } from './_components/page-create-button';
import type { Route } from './+types/root.layout';
import { authService, AuthenticationError } from '~/lib/auth-service';
import { logger } from '~/lib/logger';
import { runWithBackendStatus } from '~/lib/backend-status.server';
import { defaultResponse, refreshAndBuildResponse, buildResponseData } from './_features/root.loader';
import { getFlashMessage } from '../lib/flash-message.server';
import { FlashMessageBanner } from './_components/flash-message-banner';
import { Footer } from './_components/footer';
import type { CompanySummaryDto } from '~/api/generated';
import { logRouteError, logRouteStart, logRouteSuccess } from '~/lib/routing/route-log';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { useIsFormPage } from '~/lib/routing/create-action';
import { BOOKING_THEME_TOKENS } from '~/lib/booking-theme';
import { Button, cn } from '~/ui';
import { AuthBackground, BookingBackground, CompanyBackground } from '~/components/layout/page-backgrounds';

// If any backend call during a request fails as "backend down" (see create-logged-axios), show the problems page.
export const middleware: Route.MiddlewareFunction[] = [
  (_, next) =>
    runWithBackendStatus(async (isDown) => {
      const response = await next();
      if (isDown()) throw new Response(null, { status: 503, statusText: 'Service Unavailable' });
      return response;
    }),
];

export async function loader(args: Route.LoaderArgs) {
  const { request } = args;
  let flashHeaders: HeadersInit | undefined;

  logRouteStart('loader', 'root.layout', args);

  try {
    const { message: flashMessage, headers: flashCookie } = await getFlashMessage(request);
    const { accessToken, refreshToken } = await authService.getTokensFromRequest(request);
    flashHeaders = flashCookie ? { 'Set-Cookie': flashCookie } : undefined;

    if (!accessToken && !refreshToken) {
      const response = await defaultResponse(flashMessage, request, flashHeaders);
      logRouteSuccess('loader', 'root.layout', args, { branch: 'no-tokens' });
      return response;
    }

    if (!accessToken && refreshToken) {
      const response = await refreshAndBuildResponse(request, refreshToken, flashMessage, flashHeaders);
      logRouteSuccess('loader', 'root.layout', args, { branch: 'refresh-only' });
      return response;
    }

    if (accessToken) {
      if (authService.isTokenExpired(accessToken)) {
        if (refreshToken) {
          const response = await refreshAndBuildResponse(request, refreshToken, flashMessage, flashHeaders);
          logRouteSuccess('loader', 'root.layout', args, { branch: 'expired-access-refresh' });
          return response;
        }

        const response = await defaultResponse(flashMessage, request, flashHeaders);
        logRouteSuccess('loader', 'root.layout', args, { branch: 'expired-access-no-refresh' });
        return response;
      }

      const body = await buildResponseData(request, accessToken, flashMessage);
      const response = data(body, { headers: flashHeaders });
      logRouteSuccess('loader', 'root.layout', args, { branch: 'access-token' });
      return response;
    }

    const response = await defaultResponse(flashMessage, request, flashHeaders);
    logRouteSuccess('loader', 'root.layout', args, { branch: 'fallback-default' });
    return response;
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    logRouteError('loader', 'root.layout', args, error);
    logger.error('Root loader failed', { error: error instanceof Error ? error.message : String(error) });

    if (error instanceof AuthenticationError) {
      return await defaultResponse(null, request, flashHeaders);
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
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  // Booking a time is a focused task, so its own action bar replaces the bottom menu.
  const bookingFlowPath = ROUTES_MAP['booking.public.appointment'].href;
  const isPublicBookingFlow =
    location.pathname === bookingFlowPath || location.pathname.startsWith(`${bookingFlowPath}/`);
  // Create/edit forms (route handle `formPage`) show their own Lagre bar in its place (ui-rules, rule 2).
  const isFormPage = useIsFormPage();
  const hideMobileBottomNav = isFormPage || isPublicBookingFlow;
  // The page's create button floats above the bottom menu on phones, so the page needs room for both.
  const hasMobileCreateButton = Boolean(useAllowedCreateAction()) && !hideMobileBottomNav;
  const isBookingPublicRoute =
    location.pathname === '/booking/public' || location.pathname.startsWith('/booking/public/');
  const bookingThemeStyle = isBookingPublicRoute ? BOOKING_THEME_TOKENS[loaderData.bookingTheme] : undefined;

  const userNav = loaderData.userNavigation || undefined;
  const companyContext = loaderData.companyContext;
  const setUserNav: RootOutletContext['setUserNav'] = (_value) => undefined;
  const setCompanyContext: RootOutletContext['setCompanyContext'] = (_value) => undefined;

  const allSidebarBranches = userNav?.[RoutePlaceMent.SIDEBAR] || [];
  const systemAdminSidebarBranches = allSidebarBranches.filter((branch) => branch.id === 'system-admin');
  const hasSystemAdminSidebar = systemAdminSidebarBranches.length > 0;
  const sidebarBranches = hasSystemAdminSidebar ? systemAdminSidebarBranches : allSidebarBranches;
  const hasSidebar = sidebarBranches.length > 0 && (Boolean(companyContext) || hasSystemAdminSidebar);
  const canSwitchCompany =
    userNav?.[RoutePlaceMent.NAVIGATION]?.some((branch) => branch.id === 'user.company-context') ?? false;
  const workspace = hasSystemAdminSidebar
    ? { name: 'Systemadministrasjon', subtitle: 'Systemadmin', canSwitchCompany }
    : companyContext
      ? { name: companyContext.name ?? companyContext.orgNumber, subtitle: 'Selskap', canSwitchCompany }
      : null;

  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  // The marketing unsubscribe link (/u/:token) is for the company's customers, not its staff: no menus, no sign-in.
  if (location.pathname.startsWith('/u/')) {
    return (
      <div className="min-h-screen bg-surface text-text-primary">
        <Outlet context={{ userNav, setUserNav, companyContext, setCompanyContext }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-text-primary" style={bookingThemeStyle}>
      <FlashMessageBanner message={loaderData.flashMessage} />

      {hasSidebar ? (
        <div className="lg:grid lg:min-h-screen lg:grid-cols-[var(--app-sidebar-width)_1fr]">
          <aside className="app-sidebar sticky top-0 hidden h-screen overflow-y-auto px-3.5 py-5 lg:block">
            <Sidebar
              branches={sidebarBranches}
              workspace={workspace}
              account={
                <SidebarAccountMenu
                  userProfile={loaderData.userProfile}
                  navigationBranches={userNav?.[RoutePlaceMent.NAVIGATION] ?? []}
                />
              }
            />
          </aside>

          <div className="flex min-h-screen min-w-0 flex-col">
            {/* Phones and tablets: a primary-blue bar with one faint circle. Desktop: white, with a thin blue line on top. */}
            <header className="sticky top-0 z-10 h-[var(--app-header-height)] shrink-0 overflow-hidden bg-interactive text-on-brand lg:border-t-[3px] lg:border-b lg:border-t-interactive lg:border-b-border lg:bg-background/90 lg:text-text-primary lg:backdrop-blur">
              <span
                aria-hidden
                className="pointer-events-none absolute -top-14 -right-8 size-30 rounded-full bg-on-brand-decoration lg:hidden"
              />
              <div className="relative flex h-full w-full items-center px-4 lg:px-8">
                <Navbar
                  navRoutes={userNav}
                  userProfile={loaderData.userProfile}
                  companyContext={companyContext}
                  hasSidebar={hasSidebar}
                  onOpenSidebar={() => setMobileMenuOpen(true)}
                />
              </div>
            </header>

            {/* `relative isolate` lets each area's layout put its own background behind the page. */}
            {/* The footer already reserves room for the mobile bottom bar (except in the public booking flow). */}
            <main
              className={cn(
                'relative isolate min-w-0 flex-1 bg-surface px-3 pb-3 pt-3 sm:px-4 lg:px-8 lg:py-8',
                // Phones have no footer, so the page itself keeps room for the fixed bottom menu (about 4.5rem tall),
                // plus the create button above it when the page has one (3rem + 0.625rem gap).
                // The booking action bar reserves its own height with a spacer, so the page needs no extra room for it.
                !isPublicBookingFlow &&
                  (hasMobileCreateButton
                    ? 'pb-[calc(env(safe-area-inset-bottom)+8.875rem)] lg:pb-8'
                    : 'pb-[calc(env(safe-area-inset-bottom)+5.25rem)] lg:pb-8'),
              )}
            >
              <Outlet
                context={{
                  userNav,
                  setUserNav,
                  companyContext,
                  setCompanyContext,
                }}
              />
            </main>

            <footer
              className={cn(
                // Desktop: quiet text on the colour the page background fades to, no bar. Phones: no footer at all
                // (it only squeezed in above the bottom menu), except in the public booking flow, whose bar sits above it.
                'h-12 shrink-0 bg-page-wash-bottom lg:h-[var(--app-footer-height)]',
                isPublicBookingFlow
                  ? 'border-t border-border bg-background lg:border-0 lg:bg-page-wash-bottom'
                  : 'hidden lg:block',
              )}
            >
              <Footer />
            </footer>
          </div>

          {/* After the page in the DOM, so focus and screen-reader order match what's on screen (page → create button →
              bottom menu). Fixed and hidden from lg, so it takes no place in the grid. */}
          <MobileSidebar
            branches={sidebarBranches}
            isOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            workspace={workspace}
            showBottomNav={!hideMobileBottomNav}
            userProfile={loaderData.userProfile}
            navigationBranches={userNav?.[RoutePlaceMent.NAVIGATION] ?? []}
          />
        </div>
      ) : (
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-10 h-[var(--app-header-height)] shrink-0 border-b border-border bg-background">
            <div className="mx-auto flex h-full w-full max-w-[var(--container-xl)] items-center px-[var(--app-shell-inline-padding)]">
              <Navbar
                navRoutes={userNav}
                userProfile={loaderData.userProfile}
                companyContext={companyContext}
                hasSidebar={hasSidebar}
                onOpenSidebar={() => setMobileMenuOpen(true)}
              />
            </div>
          </header>

          <main className="relative isolate min-w-0 flex-1 bg-surface px-3 py-2 sm:px-4 lg:px-6 lg:py-4">
            <Outlet
              context={{
                userNav,
                setUserNav,
                companyContext,
                setCompanyContext,
              }}
            />
          </main>

          <footer className="h-12 shrink-0 border-t border-border bg-background">
            <Footer />
          </footer>
        </div>
      )}
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const reference = React.useMemo(
    () => Math.random().toString(16).slice(2, 6).toUpperCase() + '-' + Date.now().toString(16).slice(-2).toUpperCase(),
    [],
  );

  logger.error('Route error boundary', { error, reference });

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <ErrorPage
        icon={SearchX}
        title="Siden finnes ikke"
        description="Lenken kan være utdatert, eller siden kan ha blitt flyttet eller slettet."
        reference={reference}
        primaryAction="Gå til forsiden"
        primaryActionKind="home"
      />
    );
  }

  if (isRouteErrorResponse(error) && error.status < 500) {
    return (
      <ErrorPage
        icon={AlertTriangle}
        title="Noe gikk galt"
        description="Forespørselen kunne ikke fullføres. Prøv igjen, eller gå til forsiden."
        reference={reference}
        primaryAction="Gå til forsiden"
        primaryActionKind="home"
      />
    );
  }

  // 503 from loaders when the backend is down, and any other server or unexpected error.
  return (
    <ErrorPage
      icon={CloudOff}
      title="Det er problemer akkurat nå"
      description="Vi jobber med saken. Prøv igjen om litt."
      reference={reference}
      primaryAction="Prøv igjen"
      primaryActionKind="reload"
    />
  );
}

type ErrorPageProps = {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  description: string;
  reference: string;
  primaryAction: string;
  primaryActionKind: 'home' | 'reload';
};

// The error page replaces the whole layout, so no area layout renders its backdrop. Pick the one for the area.
function ErrorBackground() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/auth')) return <AuthBackground />;
  if (pathname.startsWith('/booking')) return <BookingBackground />;
  return <CompanyBackground />;
}

function ErrorPage({ icon: Icon, title, description, reference, primaryAction, primaryActionKind }: ErrorPageProps) {
  return (
    <div className="relative isolate flex min-h-screen flex-col bg-surface text-text-primary">
      <ErrorBackground />
      <header className="flex h-[var(--app-header-height)] shrink-0 items-center border-b border-border bg-background px-4 lg:px-8">
        <Link to="/" className="font-display text-xl font-bold tracking-tight text-interactive">
          Pitell
        </Link>
      </header>
      <main className="m-auto w-full max-w-md px-4 py-8">
        <section role="alert" className="rounded-2xl border border-border bg-background px-6 py-10 text-center">
          <span className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-amber-100 text-amber-900">
            <Icon className="size-8" aria-hidden />
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-text-primary">{title}</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-text-secondary">{description}</p>

          <div className="mt-6 flex flex-col gap-2">
            {primaryActionKind === 'reload' ? (
              <Button type="button" onClick={() => window.location.reload()} className="min-h-11">
                <RefreshCw aria-hidden="true" />
                {primaryAction}
              </Button>
            ) : (
              <Button asChild className="min-h-11">
                <Link to="/">
                  <Home aria-hidden="true" />
                  {primaryAction}
                </Link>
              </Button>
            )}
            {primaryActionKind === 'reload' ? (
              <Button asChild variant="ghost" className="min-h-11 text-interactive">
                <Link to="/">Gå til forsiden</Link>
              </Button>
            ) : (
              <Button type="button" variant="ghost" className="min-h-11" onClick={() => window.history.back()}>
                <ArrowLeft aria-hidden="true" />
                Gå tilbake
              </Button>
            )}
          </div>

          <p className="mt-6 text-xs text-text-secondary">Ref. {reference} · oppgi denne til support</p>
        </section>
      </main>
    </div>
  );
}
