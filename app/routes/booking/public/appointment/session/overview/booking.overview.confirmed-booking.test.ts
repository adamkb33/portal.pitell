import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppointmentSessionDto } from '~/api/generated';
import { action, loader } from './booking.public.appointment.session.overview.route';

const mocks = vi.hoisted(() => ({
  requireBookingReady: vi.fn(),
  submitAppointmentSession: vi.fn(),
  getAppointmentSessionOverview: vi.fn(),
  getAppointmentSessionProfiles: vi.fn(),
}));

vi.mock('~/routes/booking/public/_utils/booking.require-authenticated-flow.server', () => ({
  requireBookingReady: mocks.requireBookingReady,
}));

vi.mock('~/api/utils/with-auth', () => ({
  withAuth: (_request: Request, callback: () => unknown) => callback(),
}));

vi.mock('~/api/generated', () => ({
  PublicAppointmentSessionController: {
    submitAppointmentSession: mocks.submitAppointmentSession,
    getAppointmentSessionOverview: mocks.getAppointmentSessionOverview,
    getAppointmentSessionProfiles: mocks.getAppointmentSessionProfiles,
  },
}));

const OVERVIEW_URL = 'https://portal.pitell.no/booking/public/appointment/session/overview';
const SUCCESS_HREF = '/booking/public/appointment/success?companyId=1&appointmentId=5213';

const readySession: AppointmentSessionDto = {
  sessionId: 'session-1',
  companyId: 1,
  userId: 1150,
  selectedProfileId: 1,
  selectedServices: [{ serviceId: 15, quantity: 1 }],
  selectedStartTime: '2026-11-23T13:30:00Z',
};

// What the backend returns once the booking is confirmed: services and time are cleared.
const usedSession: AppointmentSessionDto = { ...readySession, selectedServices: [], selectedStartTime: undefined };

async function confirmBooking(): Promise<string> {
  mocks.requireBookingReady.mockResolvedValueOnce({ session: readySession });
  const response = (await action({
    request: new Request(OVERVIEW_URL, { method: 'POST', body: new URLSearchParams() }),
  } as never)) as Response;
  const cookie = response.headers.get('Set-Cookie')?.match(/booking_confirmed=[^;]+/)?.[0];
  if (!cookie) throw new Error('Confirming did not set the booking_confirmed cookie');
  return cookie;
}

function loadOverview(session: AppointmentSessionDto, cookie?: string) {
  mocks.requireBookingReady.mockResolvedValueOnce({ session });
  return loader({
    request: new Request(OVERVIEW_URL, { headers: cookie ? { Cookie: cookie } : {} }),
  } as never);
}

describe('booking overview after a confirmed booking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.submitAppointmentSession.mockResolvedValue({ data: { data: { appointmentId: 5213 } } });
    mocks.getAppointmentSessionOverview.mockResolvedValue({ data: { data: { sessionId: 'session-1' } } });
    mocks.getAppointmentSessionProfiles.mockResolvedValue({ data: { data: [{ id: 1 }, { id: 2 }] } });
  });

  it('goes to the confirmation and remembers the booking when confirming', async () => {
    mocks.requireBookingReady.mockResolvedValueOnce({ session: readySession });

    const response = (await action({
      request: new Request(OVERVIEW_URL, { method: 'POST', body: new URLSearchParams() }),
    } as never)) as Response;

    expect(response.headers.get('Location')).toBe(SUCCESS_HREF);
    expect(response.headers.get('Set-Cookie')).toContain('booking_confirmed=');
    expect(response.headers.get('Set-Cookie')).toContain('HttpOnly');
  });

  it('shows the confirmation when the overview is reloaded after confirming', async () => {
    const cookie = await confirmBooking();

    const result = await loadOverview(usedSession, cookie);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get('Location')).toBe(SUCCESS_HREF);
    expect(mocks.getAppointmentSessionOverview).not.toHaveBeenCalled();
  });

  it('shows the overview for a new booking in the same session', async () => {
    const cookie = await confirmBooking();

    const result = await loadOverview(readySession, cookie);

    expect(result).not.toBeInstanceOf(Response);
    expect(result).toMatchObject({ sessionOverview: { sessionId: 'session-1' } });
  });

  it('ignores a confirmed booking from another session', async () => {
    const cookie = await confirmBooking();

    const result = await loadOverview({ ...usedSession, sessionId: 'session-2' }, cookie);

    expect((result as Response | undefined)?.headers?.get('Location')).not.toBe(SUCCESS_HREF);
    expect(mocks.getAppointmentSessionOverview).toHaveBeenCalledOnce();
  });
});
