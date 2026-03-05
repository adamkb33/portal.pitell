import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionMock = vi.fn();
const getUserStatusMock = vi.fn();

vi.mock('~/lib/appointments.server', () => ({
  getSession: getSessionMock,
}));

vi.mock('~/routes/booking/public/appointment/session/contact/_services/contact-auth.service.server', () => ({
  ContactAuthService: {
    getUserStatus: getUserStatusMock,
  },
}));

describe('requireAuthenticatedBookingFlow', () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    getUserStatusMock.mockReset();
  });

  it('redirects to sign-in when session user exists but auth status missing', async () => {
    getSessionMock.mockResolvedValue({ sessionId: 's1', userId: 10 });
    getUserStatusMock.mockResolvedValue(null);

    const { requireAuthenticatedBookingFlow } = await import(
      '~/routes/booking/public/appointment/session/_utils/require-authenticated-booking-flow.server'
    );

    const result = await requireAuthenticatedBookingFlow(new Request('http://localhost/x'));

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get('Location')).toBe('/booking/public/appointment/session/contact/sign-in');
  });

  it('redirects to required auth next step when nextStep is not DONE', async () => {
    getSessionMock.mockResolvedValue({ sessionId: 's1', userId: 10 });
    getUserStatusMock.mockResolvedValue({ nextStep: 'VERIFY_EMAIL' });

    const { requireAuthenticatedBookingFlow } = await import(
      '~/routes/booking/public/appointment/session/_utils/require-authenticated-booking-flow.server'
    );

    const result = await requireAuthenticatedBookingFlow(new Request('http://localhost/x'));

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get('Location')).toBe('/booking/public/appointment/session/contact/verify-email');
  });

  it('returns session when auth flow is done', async () => {
    const session = { sessionId: 's1', userId: 10 };
    getSessionMock.mockResolvedValue(session);
    getUserStatusMock.mockResolvedValue({ nextStep: 'DONE' });

    const { requireAuthenticatedBookingFlow } = await import(
      '~/routes/booking/public/appointment/session/_utils/require-authenticated-booking-flow.server'
    );

    const result = await requireAuthenticatedBookingFlow(new Request('http://localhost/x'));

    expect(result).toEqual({ session });
  });
});
