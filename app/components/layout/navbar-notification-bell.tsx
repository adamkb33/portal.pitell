import * as React from 'react';
import { createPortal } from 'react-dom';
import { Bell, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import axios from 'axios';
import type { InAppNotificationDto } from '~/api/generated';
import { API_ROUTES_MAP, ROUTES_MAP } from '~/lib/routing/route-tree';
import { NotificationRow } from '~/routes/company/notifications/_components/notification-row';
import { notificationTimeLabel } from '~/routes/company/notifications/_utils/notification-display';
import { cn, Popover, PopoverContent, PopoverTrigger } from '~/ui';
import { navbarIconButtonClassName, navbarOnBrandClassName } from './navbar-controls';

const NAVBAR_NOTIFICATION_POLL_MS = 15_000;
const NAVBAR_NOTIFICATION_API_URL = API_ROUTES_MAP['auth.navbar-notifications'].url;

type NavbarNotificationsState = {
  items: InAppNotificationDto[];
  unreadCount: number;
};

/**
 * The bell and its panel (approved sketch 2026-11-10): the latest notifications in the same rows as the Varsler page,
 * how many are unread, and "Se alle varsler". A popover on desktop; on phones the same panel drops full width under
 * the blue bar and dims the page behind it.
 * `onBrand`: sits on the blue phone bar below `lg` (white icon); desktop keeps the white header's colors.
 */
export function NavbarNotificationBell({ onBrand = false }: { onBrand?: boolean }) {
  const { pathname, key: locationKey } = useLocation();
  const [open, setOpen] = React.useState(false);
  const [{ items, unreadCount }, setNotifications] = React.useState<NavbarNotificationsState>({
    items: [],
    unreadCount: 0,
  });

  // Load now, every 15 s, and after every navigation or form submission: opening a notification or "Merk alle som
  // lest" reads them, so the count drops at once.
  React.useEffect(() => {
    let isActive = true;
    let currentController: AbortController | null = null;

    const loadNotifications = async () => {
      currentController?.abort();
      const controller = new AbortController();
      currentController = controller;
      try {
        const { data: payload } = await axios.get<Partial<NavbarNotificationsState>>(NAVBAR_NOTIFICATION_API_URL, {
          withCredentials: true,
          signal: controller.signal,
        });
        if (!isActive || controller.signal.aborted || !Array.isArray(payload.items)) return;
        setNotifications({ items: payload.items, unreadCount: Number(payload.unreadCount ?? 0) });
      } catch {
        // Keep showing the last known state; the next poll tries again.
      }
    };

    void loadNotifications();
    const intervalId = window.setInterval(() => void loadNotifications(), NAVBAR_NOTIFICATION_POLL_MS);

    return () => {
      isActive = false;
      currentController?.abort();
      window.clearInterval(intervalId);
    };
  }, [locationKey]);

  // A new page closes the panel (Escape and taps outside close it already).
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const close = () => setOpen(false);
  const unreadLabel = unreadCount > 9 ? '9+' : String(unreadCount);
  const now = new Date();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unreadCount > 0 ? `Varsler, ${unreadCount} uleste` : 'Varsler'}
          className={cn(
            navbarIconButtonClassName,
            onBrand && navbarOnBrandClassName,
            'data-[state=open]:bg-blue-50 data-[state=open]:text-interactive',
            onBrand && 'data-[state=open]:bg-on-brand-hover data-[state=open]:text-on-brand',
            onBrand && 'lg:data-[state=open]:bg-blue-50 lg:data-[state=open]:text-interactive',
          )}
        >
          <Bell className="size-5" strokeWidth={1.75} aria-hidden />
          {unreadCount > 0 ? (
            <span
              aria-hidden
              className={cn(
                'absolute top-1 right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[11px] leading-none font-semibold text-text-inverse ring-2 ring-background',
                onBrand && 'ring-interactive lg:ring-background',
              )}
            >
              {unreadLabel}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>

      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              aria-hidden
              className="fixed inset-x-0 top-[var(--app-header-height)] bottom-0 z-55 bg-scrim lg:hidden"
            />,
            document.body,
          )
        : null}

      <PopoverContent
        align="end"
        collisionPadding={0}
        aria-label="Varsler"
        className="w-screen max-w-none overflow-hidden rounded-none rounded-b-2xl border-x-0 border-t-0 p-0 shadow-(--shadow-floating) lg:w-[25rem] lg:rounded-2xl lg:border-x lg:border-t"
      >
        <div className="flex items-baseline justify-between gap-3 px-4 pt-3.5 pb-3 sm:px-5">
          <h2 className="font-display text-[1.0625rem] font-semibold tracking-tight text-text-primary">Varsler</h2>
          {unreadCount > 0 ? (
            <span className="text-sm text-text-secondary">
              {unreadCount} {unreadCount === 1 ? 'ulest' : 'uleste'}
            </span>
          ) : null}
        </div>

        {items.length > 0 ? (
          <ul className="max-h-[min(60vh,26rem)] divide-y divide-border overflow-y-auto border-t border-border">
            {items.map((notification) => (
              <li key={notification.id}>
                <NotificationRow
                  notification={notification}
                  time={notificationTimeLabel(notification.createdAt, now)}
                  chevron={false}
                  onNavigate={close}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-t border-border px-5 py-8 text-center text-sm text-text-secondary">Ingen varsler</p>
        )}

        <Link
          to={ROUTES_MAP['company.notifications'].href}
          onClick={close}
          className="flex h-12 items-center justify-center gap-1 border-t border-border text-sm font-semibold text-interactive transition-colors hover:bg-surface-variant-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-interactive"
        >
          Se alle varsler
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </PopoverContent>
    </Popover>
  );
}
