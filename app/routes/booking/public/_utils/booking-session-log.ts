import type { AppointmentSessionDto } from '~/api/generated';

/** The booking session's state for a log line: which session, and how far the customer has come. */
export function getBookingSessionLogContext(session?: AppointmentSessionDto | null): Record<string, unknown> {
  if (!session) {
    return {};
  }

  return {
    sessionId: session.sessionId,
    companyId: session.companyId,
    userId: session.userId ?? null,
    selectedProfileId: session.selectedProfileId ?? null,
    selectedServicesCount: session.selectedServices?.length ?? 0,
    hasSelectedStartTime: Boolean(session.selectedStartTime),
  };
}
