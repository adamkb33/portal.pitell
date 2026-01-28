import { Clock3, MessageSquareQuote } from 'lucide-react';
import type { InAppNotificationDto } from '~/api/generated/notification';
import { Badge } from '~/components/ui/badge';
import { TableCell, TableRow } from '~/components/ui/table';
import { compactText, formatNotificationTimestamp } from '../_utils/format';
import { getNotificationHeadline } from '../_utils/query';

type NotificationTableRowProps = {
  notification: InAppNotificationDto;
  isViewed: boolean;
  onOpen: (notification: InAppNotificationDto) => void;
};

export function NotificationTableRow({ notification, isViewed, onOpen }: NotificationTableRowProps) {
  return (
    <TableRow
      className={isViewed ? 'cursor-pointer opacity-80' : 'cursor-pointer'}
      onClick={() => onOpen(notification)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(notification);
        }
      }}
    >
      <TableCell className="space-y-1 py-3 align-top">
        <p className="font-medium text-foreground">{formatNotificationTimestamp(notification.createdAt)}</p>
        <p className="text-xs text-muted-foreground">
          Oppdatert: {formatNotificationTimestamp(notification.updatedAt ?? notification.createdAt)}
        </p>
      </TableCell>

      <TableCell className="py-3 align-top">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground">{getNotificationHeadline(notification)}</p>
            {!isViewed && (
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" />
            )}
          </div>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MessageSquareQuote className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p className="line-clamp-2">{compactText(notification.content)}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="py-3 align-top">
        <div className="space-y-2">
          <Badge variant={isViewed ? 'outline' : 'default'}>{isViewed ? 'Lest' : 'Ulest'}</Badge>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            <span>Lest: {notification.readAt ? formatNotificationTimestamp(notification.readAt) : 'Ikke lest ennå'}</span>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
