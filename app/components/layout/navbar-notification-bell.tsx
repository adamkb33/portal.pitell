import * as React from 'react';
import { Bell, BellRing, ChevronRight, Circle } from 'lucide-react';
import { Link } from 'react-router';
import axios from 'axios';
import { type InAppNotificationDto } from '~/api/generated/notification';
import { API_ROUTES_MAP, ROUTES_MAP } from '~/lib/route-tree';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { formatNotificationTimestamp } from '~/routes/company/notifications/_utils/format';
import { getNotificationHeadline } from '~/routes/company/notifications/_utils/query';

const NAVBAR_NOTIFICATION_POLL_MS = 15_000;
const NAVBAR_NOTIFICATION_API_URL = API_ROUTES_MAP['auth.navbar-notifications'].url;

type NavbarNotificationsState = {
  items: InAppNotificationDto[];
  hasUnread: boolean;
};

export function NavbarNotificationBell() {
  const notificationsHref = ROUTES_MAP['company.notifications'].href;
  const [notifications, setNotifications] = React.useState<NavbarNotificationsState>({
    items: [],
    hasUnread: false,
  });

  const loadNotifications = React.useEffectEvent(async (signal: AbortSignal) => {
    try {
      const response = await axios.get<NavbarNotificationsState | { error?: string }>(NAVBAR_NOTIFICATION_API_URL, {
        withCredentials: true,
        signal,
      });

      const payload = response.data;

      if (signal.aborted) {
        return;
      }

      if ('items' in payload && 'hasUnread' in payload) {
        setNotifications({
          items: payload.items ?? [],
          hasUnread: Boolean(payload.hasUnread),
        });
      }
    } catch {}
  });

  React.useEffect(() => {
    const controller = new AbortController();

    void loadNotifications(controller.signal);

    const intervalId = window.setInterval(() => {
      void loadNotifications(controller.signal);
    }, NAVBAR_NOTIFICATION_POLL_MS);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [loadNotifications]);

  const { items, hasUnread } = notifications;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={hasUnread ? 'Varsler med uleste meldinger' : 'Varsler'}
          className="relative h-11 w-11 rounded-md border border-navbar-border bg-navbar-icon-bg text-navbar-text hover:bg-navbar-accent hover:border-primary hover:text-primary transition-all duration-200"
        >
          {hasUnread ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
          {hasUnread && (
            <>
              <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-destructive" aria-hidden="true" />
              <span className="sr-only">Du har uleste varsler</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[min(92vw,24rem)] p-0">
        <div className="border-b border-border/60 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <DropdownMenuLabel className="px-0 pt-0 pb-1 text-[11px]">Varsler</DropdownMenuLabel>
              <p className="text-sm font-medium text-foreground">
                {hasUnread ? 'Du har uleste varsler' : 'Siste varsler'}
              </p>
            </div>
            <Badge variant={hasUnread ? 'default' : 'outline'} className="shrink-0">
              {hasUnread ? 'Ulest' : 'Oppdatert'}
            </Badge>
          </div>
        </div>

        {items.length > 0 ? (
          <div className="max-h-[min(60vh,26rem)] overflow-y-auto p-2">
            {items.map((notification) => {
              const href = ROUTES_MAP['company.notifications.view'].href.replace(':id', notification.id.toString());
              const isUnread = notification.readAt == null;

              return (
                <DropdownMenuItem key={notification.id} asChild className="items-start px-0 py-0 focus:bg-transparent">
                  <Link
                    to={href}
                    className="flex w-full items-start gap-3 rounded-md px-3 py-3 hover:bg-accent/10 focus:bg-accent/15"
                  >
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {isUnread ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-semibold text-foreground">
                          {getNotificationHeadline(notification)}
                        </p>
                        {isUnread && <Circle className="mt-1 h-2.5 w-2.5 shrink-0 fill-current text-primary" />}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{notification.content}</p>
                      <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                        {formatNotificationTimestamp(notification.createdAt)}
                      </p>
                    </div>
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-6 text-center">
            <p className="text-sm font-medium text-foreground">Ingen varsler ennå</p>
            <p className="mt-1 text-xs text-muted-foreground">Nye in-app varsler vises her når de kommer inn.</p>
          </div>
        )}

        <div className="border-t border-border/60 p-2">
          <DropdownMenuItem asChild className="justify-between">
            <Link to={notificationsHref}>
              Se alle varsler
              <ChevronRight className="h-4 w-4" />
            </Link>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
