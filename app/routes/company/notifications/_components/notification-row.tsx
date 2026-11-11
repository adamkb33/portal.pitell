import { Bell, CalendarPlus, ChevronRight, FileText, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import type { InAppNotificationDto } from '~/api/generated';
import { cn } from '~/ui';
import {
  isUnread,
  notificationHref,
  notificationKind,
  notificationSummary,
  notificationTitle,
  type NotificationKind,
} from '../_utils/notification-display';

// The tile wears the colour of the domain the notification is about (Booking teal, Tilbud orange); blue stays for
// the unread dot. Full class names so Tailwind can see them.
const KIND_TILES: Record<NotificationKind, { icon: LucideIcon; className: string }> = {
  appointment: { icon: CalendarPlus, className: 'bg-category-teal-tint text-category-teal-ink' },
  offer: { icon: FileText, className: 'bg-category-orange-tint text-category-orange-ink' },
  other: { icon: Bell, className: 'bg-surface-variant-1 text-text-secondary' },
};

export function NotificationTile({
  notification,
  className,
}: {
  notification: Pick<InAppNotificationDto, 'sourceRefType'>;
  className?: string;
}) {
  const { icon: Icon, className: tone } = KIND_TILES[notificationKind(notification)];
  return (
    <span aria-hidden className={cn('grid size-9 shrink-0 place-items-center rounded-[10px]', tone, className)}>
      <Icon className="size-5" strokeWidth={1.75} />
    </span>
  );
}

type NotificationRowProps = {
  notification: InAppNotificationDto;
  /** "19:01" in the list (its day strip names the day), "I går" in the bell. */
  time: string;
  /** Rows in a list end in a chevron; the bell's compact rows don't. */
  chevron?: boolean;
  onNavigate?: () => void;
};

/**
 * One notification: its domain's tile, the title (bold while unread), the message on one line, the time and a blue
 * dot while unread. The whole row opens the notification's own page, which marks it as read.
 */
export function NotificationRow({ notification, time, chevron = true, onNavigate }: NotificationRowProps) {
  const unread = isUnread(notification);

  return (
    <Link
      to={notificationHref(notification)}
      onClick={onNavigate}
      className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-variant-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-interactive sm:px-5"
    >
      <NotificationTile notification={notification} />
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-text-primary', unread ? 'font-bold' : 'font-medium')}>
          {unread ? <span className="sr-only">Ulest: </span> : null}
          {notificationTitle(notification)}
        </span>
        <span className="block truncate text-sm text-text-secondary">{notificationSummary(notification.content)}</span>
      </span>
      <span className="shrink-0 text-[0.8125rem] text-text-secondary tabular-nums">{time}</span>
      <span
        aria-hidden
        className={cn('size-2.5 shrink-0 rounded-full', unread ? 'bg-interactive' : 'bg-transparent')}
      />
      {chevron ? <ChevronRight className="size-4 shrink-0 text-text-secondary" aria-hidden /> : null}
    </Link>
  );
}
