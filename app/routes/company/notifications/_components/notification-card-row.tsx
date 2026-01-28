import type { ReactNode } from 'react';
import { Clock3, Eye, MessageSquareQuote } from 'lucide-react';
import type { InAppNotificationDto } from '~/api/generated/notification';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent } from '~/components/ui/card';
import { cn } from '~/lib/utils';
import { compactText, formatNotificationTimestamp } from '../_utils/format';
import { getNotificationHeadline } from '../_utils/query';

type NotificationCardRowProps = {
  notification: InAppNotificationDto;
  isViewed: boolean;
  onOpen: (notification: InAppNotificationDto) => void;
};

export function NotificationCardRow({ notification, isViewed, onOpen }: NotificationCardRowProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer shadow-sm hover:shadow-md',
        isViewed ? 'border-l-4 border-l-slate-300' : 'border-l-4 border-l-primary',
      )}
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
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{getNotificationHeadline(notification)}</p>
            {!isViewed && (
              <Badge className="h-5 rounded-full px-2 text-[10px]">Ny</Badge>
            )}
          </div>
            <p className="text-xs text-muted-foreground">
              Opprettet {formatNotificationTimestamp(notification.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge variant={isViewed ? 'outline' : 'default'}>{isViewed ? 'Lest' : 'Ulest'}</Badge>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-md bg-muted/40 p-3 text-sm leading-relaxed text-foreground">
          <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p>{compactText(notification.content)}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-card-header-border pt-3">
          <InfoRow
            icon={<Clock3 className="h-3.5 w-3.5 text-muted-foreground" />}
            label="Oppdatert"
            value={formatNotificationTimestamp(notification.updatedAt ?? notification.createdAt)}
          />
          <InfoRow
            icon={<Eye className="h-3.5 w-3.5 text-muted-foreground" />}
            label="Lest"
            value={notification.readAt ? formatNotificationTimestamp(notification.readAt) : 'Ikke lest ennå'}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      {icon}
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        <p className="break-words text-foreground">{value}</p>
      </div>
    </div>
  );
}
