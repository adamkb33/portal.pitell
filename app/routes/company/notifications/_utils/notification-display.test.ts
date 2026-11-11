import { describe, expect, it } from 'vitest';
import type { InAppNotificationDto } from '~/api/generated';
import {
  groupNotificationsByDay,
  notificationAppointmentId,
  notificationHref,
  notificationKind,
  notificationMessage,
  notificationSummary,
  notificationTimeLabel,
  notificationTitle,
} from './notification-display';
import { parseNotificationListRequest } from './query';

const BOOKING_CONTENT = `Adam Baser har bestilt Hårklipp den 11.11.2026 10:00.

Åpne timebestilling: http://localhost:5173/company/booking/appointments/278`;

function notification(id: number, createdAt: string, extra: Partial<InAppNotificationDto> = {}): InAppNotificationDto {
  return {
    id,
    companyId: 1,
    recipientUserId: 1,
    subject: 'Ny timebestilling',
    content: BOOKING_CONTENT,
    sourceService: 'booking-service',
    sourceRefType: 'APPOINTMENT',
    sourceRefId: '278',
    createdAt,
    ...extra,
  };
}

// A fixed "now" (local time) so day labels don't depend on when the tests run.
const now = new Date(2026, 10, 10, 20, 0);

describe('notification text', () => {
  it('drops the link line, keeps the sentence', () => {
    expect(notificationMessage(BOOKING_CONTENT)).toBe('Adam Baser har bestilt Hårklipp den 11.11.2026 10:00.');
    expect(notificationSummary('Linje en.\n\nLinje   to.')).toBe('Linje en. Linje to.');
    expect(notificationMessage(undefined)).toBe('');
  });

  it('falls back to "Varsel" without a subject', () => {
    expect(notificationTitle({ subject: '  ' })).toBe('Varsel');
    expect(notificationTitle({ subject: 'Ny timebestilling' })).toBe('Ny timebestilling');
  });
});

describe('what a notification is about', () => {
  it('reads the kind from the source type, case-insensitively', () => {
    expect(notificationKind({ sourceRefType: 'APPOINTMENT' })).toBe('appointment');
    expect(notificationKind({ sourceRefType: 'offer_message' })).toBe('offer');
    expect(notificationKind({ sourceRefType: 'BOOKING_OTP_SIGN_IN' })).toBe('other');
    expect(notificationKind({})).toBe('other');
  });

  it('names the appointment only for a numeric id on an appointment notification', () => {
    expect(notificationAppointmentId({ sourceRefType: 'APPOINTMENT', sourceRefId: '278' })).toBe(278);
    expect(notificationAppointmentId({ sourceRefType: 'APPOINTMENT', sourceRefId: '12abc' })).toBeNull();
    expect(notificationAppointmentId({ sourceRefType: 'APPOINTMENT' })).toBeNull();
    expect(notificationAppointmentId({ sourceRefType: 'OFFER', sourceRefId: '278' })).toBeNull();
  });

  it("links every row to the notification's own page", () => {
    expect(notificationHref({ id: 42 })).toBe('/company/notifications/42');
  });
});

describe('days and times', () => {
  it('groups by the day they arrived, newest first, with I dag and I går', () => {
    const groups = groupNotificationsByDay(
      [
        notification(4, new Date(2026, 10, 10, 19, 1).toISOString()),
        notification(3, new Date(2026, 10, 9, 19, 50).toISOString()),
        notification(2, new Date(2026, 10, 9, 19, 33).toISOString()),
        notification(1, new Date(2026, 10, 7, 10, 58).toISOString()),
      ],
      now,
    );
    expect(groups.map((group) => [group.label, group.items.map((item) => item.id)])).toEqual([
      ['I dag · tirsdag 10. nov.', [4]],
      ['I går · mandag 9. nov.', [3, 2]],
      ['lørdag 7. nov.', [1]],
    ]);
  });

  it('labels the time for the bell: clock today, I går, then the date', () => {
    expect(notificationTimeLabel(new Date(2026, 10, 10, 19, 1).toISOString(), now)).toBe('19:01');
    expect(notificationTimeLabel(new Date(2026, 10, 9, 8, 0).toISOString(), now)).toBe('I går');
    expect(notificationTimeLabel(new Date(2026, 10, 7, 10, 58).toISOString(), now)).toBe('7. nov.');
    expect(notificationTimeLabel(new Date(2025, 11, 24, 12, 0).toISOString(), now)).toBe('24. des. 2025');
  });
});

describe('list URL', () => {
  it('shows all by default and only unread with ?vis=uleste', () => {
    expect(parseNotificationListRequest(new URL('http://x/company/notifications')).requestPayload).toEqual({
      page: 0,
      size: 20,
      sortBy: 'createdAt',
      sortDirection: 'DESC',
    });
    const unread = parseNotificationListRequest(new URL('http://x/company/notifications?vis=uleste&page=2'));
    expect(unread.filters).toEqual({ page: 2, unreadOnly: true });
    expect(unread.requestPayload).toMatchObject({ page: 2, read: false });
  });
});
