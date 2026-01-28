import type { GetInAppNotificationsRequest, InAppNotificationDto } from '~/api/generated/notification';
import { formatDateBoundaryInTimeZone } from '~/lib/query';

export type NotificationReadFilter = 'all' | 'read' | 'unread';

export type InAppNotificationFilters = {
  page: number;
  size: number;
  fromDate?: string;
  toDate?: string;
  read: NotificationReadFilter;
};

export function parseNotificationListRequest(url: URL): {
  filters: InAppNotificationFilters;
  requestPayload: GetInAppNotificationsRequest;
} {
  const page = parseInteger(url.searchParams.get('page'), 0);
  const size = parseInteger(url.searchParams.get('size'), 10);
  const fromDate = url.searchParams.get('fromDate') || undefined;
  const toDate = url.searchParams.get('toDate') || undefined;
  const read = parseReadFilter(url.searchParams.get('read'));

  const requestPayload: GetInAppNotificationsRequest = {
    page,
    size,
    sortBy: 'createdAt',
    sortDirection: 'DESC',
    ...(fromDate ? { fromDateTime: formatDateBoundaryInTimeZone(fromDate, 'start') } : {}),
    ...(toDate ? { toDateTime: formatDateBoundaryInTimeZone(toDate, 'end') } : {}),
    ...(read === 'read' ? { read: true } : {}),
    ...(read === 'unread' ? { read: false } : {}),
  };

  return {
    filters: {
      page,
      size,
      fromDate,
      toDate,
      read,
    },
    requestPayload,
  };
}

export function getNotificationHeadline(notification: InAppNotificationDto) {
  return notification.subject?.trim() || 'Varsel uten emne';
}

function parseInteger(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseReadFilter(value: string | null): NotificationReadFilter {
  if (value === 'read' || value === 'unread') {
    return value;
  }

  return 'all';
}
