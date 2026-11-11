import type { GetInAppNotificationsRequest } from '~/api/generated';

/** Alle | Uleste lives in the URL (`?vis=uleste`), like every list filter. */
export const SHOW_PARAM = 'vis';
export const SHOW_UNREAD = 'uleste';
export const NOTIFICATIONS_PAGE_SIZE = 20;

export type NotificationListFilters = {
  page: number;
  unreadOnly: boolean;
};

export function parseNotificationListRequest(url: URL): {
  filters: NotificationListFilters;
  requestPayload: GetInAppNotificationsRequest;
} {
  const page = parsePage(url.searchParams.get('page'));
  const unreadOnly = url.searchParams.get(SHOW_PARAM) === SHOW_UNREAD;

  return {
    filters: { page, unreadOnly },
    requestPayload: {
      page,
      size: NOTIFICATIONS_PAGE_SIZE,
      sortBy: 'createdAt',
      sortDirection: 'DESC',
      ...(unreadOnly ? { read: false } : {}),
    },
  };
}

/** Counts the unread ones: one row is enough, the total says how many. */
export const UNREAD_COUNT_REQUEST: GetInAppNotificationsRequest = {
  page: 0,
  size: 1,
  sortBy: 'createdAt',
  sortDirection: 'DESC',
  read: false,
};

function parsePage(value: string | null): number {
  const parsed = value ? Number.parseInt(value, 10) : 0;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}
