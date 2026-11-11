import { format, isSameDay, isSameYear, parseISO, subDays } from 'date-fns';
import { nb } from 'date-fns/locale';
import type { InAppNotificationDto } from '~/api/generated';
import { ROUTES_MAP } from '~/lib/routing/route-tree';

/** What a notification is about, for its tile: its domain's colour and icon. */
export type NotificationKind = 'appointment' | 'offer' | 'other';

export function notificationKind(notification: Pick<InAppNotificationDto, 'sourceRefType'>): NotificationKind {
  const type = notification.sourceRefType?.trim().toUpperCase();
  if (type === 'APPOINTMENT') return 'appointment';
  if (type === 'OFFER' || type === 'OFFER_MESSAGE') return 'offer';
  return 'other';
}

export function isUnread(notification: Pick<InAppNotificationDto, 'readAt'>): boolean {
  return notification.readAt == null;
}

export function notificationTitle(notification: Pick<InAppNotificationDto, 'subject'>): string {
  return notification.subject?.trim() || 'Varsel';
}

export function notificationHref(notification: Pick<InAppNotificationDto, 'id'>): string {
  return ROUTES_MAP['company.notifications.view'].href.replace(':id', String(notification.id));
}

/** The appointment a notification is about, when it names one by a numeric id. */
export function notificationAppointmentId(
  notification: Pick<InAppNotificationDto, 'sourceRefType' | 'sourceRefId'>,
): number | null {
  if (notificationKind(notification) !== 'appointment') return null;
  const id = notification.sourceRefId?.trim();
  return id && /^\d+$/.test(id) ? Number(id) : null;
}

/**
 * The message as people read it. Lines with a link ("Åpne timebestilling: https://…") go, because the page links to
 * the thing itself; line breaks stay.
 */
export function notificationMessage(content: string | undefined): string {
  return (content ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/https?:\/\//i.test(line))
    .join('\n');
}

/** The message on one line, for rows. */
export function notificationSummary(content: string | undefined): string {
  return notificationMessage(content).replace(/\s+/g, ' ');
}

export type NotificationDayGroup = {
  key: string;
  /** "I dag · tirsdag 10. nov.", "I går · mandag 9. nov.", "lørdag 7. nov." (the first letter is capitalised in CSS). */
  label: string;
  items: InAppNotificationDto[];
};

/** Newest first, grouped by the day they arrived, like the appointment list. */
export function groupNotificationsByDay(
  notifications: InAppNotificationDto[],
  now = new Date(),
): NotificationDayGroup[] {
  const groups = new Map<string, NotificationDayGroup>();
  for (const notification of notifications) {
    if (!notification.createdAt) continue;
    const date = parseISO(notification.createdAt);
    const key = format(date, 'yyyy-MM-dd');
    let group = groups.get(key);
    if (!group) {
      const prefix = isSameDay(date, now) ? 'I dag · ' : isSameDay(date, subDays(now, 1)) ? 'I går · ' : '';
      group = { key, label: `${prefix}${format(date, 'EEEE d. MMM', { locale: nb })}`, items: [] };
      groups.set(key, group);
    }
    group.items.push(notification);
  }
  return Array.from(groups.values());
}

/** "19:01" (the list's day strip says which day). */
export function notificationClock(createdAt: string | undefined): string {
  return createdAt ? format(parseISO(createdAt), 'HH:mm') : '';
}

/** For the bell, which has no day strips: "19:01" today, "I går", "7. nov.", "7. nov. 2025". */
export function notificationTimeLabel(createdAt: string | undefined, now = new Date()): string {
  if (!createdAt) return '';
  const date = parseISO(createdAt);
  if (isSameDay(date, now)) return format(date, 'HH:mm');
  if (isSameDay(date, subDays(now, 1))) return 'I går';
  return format(date, isSameYear(date, now) ? 'd. MMM' : 'd. MMM yyyy', { locale: nb });
}

/** "tirsdag 10. november kl. 19:01" (capitalised in CSS). */
export function notificationReceivedAt(createdAt: string | undefined): string {
  return createdAt ? format(parseISO(createdAt), "EEEE d. MMMM 'kl.' HH:mm", { locale: nb }) : '';
}
