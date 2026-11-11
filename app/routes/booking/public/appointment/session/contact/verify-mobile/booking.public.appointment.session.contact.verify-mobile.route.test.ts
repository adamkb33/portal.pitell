import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireBookingSession: vi.fn(),
  cancelContactReplacement: vi.fn(),
}));

vi.mock('~/api/generated', () => ({
  Booking: {
    cancelAppointmentSessionContactReplacement: mocks.cancelContactReplacement,
  },
  PublicAppointmentSessionController: {
    getAppointmentSessionRequirements: vi.fn(),
    resendAppointmentSessionMobileChallenge: vi.fn(),
    verifyAppointmentSessionUserMobile: vi.fn(),
  },
}));

vi.mock('~/api/utils/with-auth', () => ({
  withAuth: async (_request: Request, callback: () => unknown) => callback(),
}));

vi.mock('~/lib/auth-service', () => ({
  authService: { setAuthCookies: vi.fn() },
}));

vi.mock('~/routes/booking/public/_utils/booking-flow-log.server', () => ({
  withBookingBackendCall: async (_context: unknown, callback: () => unknown) => callback(),
  withBookingFlowLog: async (_context: unknown, callback: () => unknown) => callback(),
}));

vi.mock('~/routes/booking/public/_utils/booking.require-authenticated-flow.server', () => ({
  requireBookingSession: mocks.requireBookingSession,
}));

vi.mock('~/routes/booking/public/_utils/booking.route-map', () => ({
  getBookingRouteMap: () => ({
    contact: '/contact',
    contactVerifyMobile: '/contact/verify-mobile',
    overview: '/overview',
  }),
}));

vi.mock('../_utils/mobile-verification-token.cookie.server', () => ({
  mobileVerificationTokenCookie: { serialize: vi.fn() },
}));

import { action } from './booking.public.appointment.session.contact.verify-mobile.route';

describe('booking contact mobile verification route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireBookingSession.mockResolvedValue({
      session: { sessionId: 'session-1', userId: 9 },
    });
    mocks.cancelContactReplacement.mockResolvedValue({ data: { data: null } });
  });

  it('cancels a pending replacement and returns to the overview', async () => {
    const result = await action({ request: replacementRequest('cancel-replacement') } as never);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get('Location')).toBe('/overview');
    expect(mocks.cancelContactReplacement).toHaveBeenCalledWith({ path: { sessionId: 'session-1' } });
  });

  it('cancels the pending challenge before changing the replacement mobile again', async () => {
    const result = await action({ request: replacementRequest('change-mobile') } as never);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get('Location')).toBe('/contact?edit=1');
    expect(mocks.cancelContactReplacement).toHaveBeenCalledWith({ path: { sessionId: 'session-1' } });
  });
});

function replacementRequest(intent: string) {
  return new Request('https://portal.pitell.no/contact/verify-mobile?replacement=1', {
    method: 'POST',
    body: new URLSearchParams({ intent, replacement: '1' }),
  });
}
