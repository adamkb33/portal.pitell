import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getSessionResult: vi.fn(),
  deleteSession: vi.fn(),
  getAppointmentSessionRequirements: vi.fn(),
}));

vi.mock('~/routes/booking/public/_services/booking.appointment-session.service.server', () => ({
  AppointmentSessionService: {
    getResult: mocks.getSessionResult,
    delete: mocks.deleteSession,
  },
}));

vi.mock('~/api/generated', () => ({
  PublicAppointmentSessionController: {
    getAppointmentSessionRequirements: mocks.getAppointmentSessionRequirements,
  },
}));

import {
  requireAuthenticatedBookingFlow,
  requireBookingReady,
  requireBookingSession,
} from '~/routes/booking/public/_utils/booking.require-authenticated-flow.server';

describe('booking session guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionResult.mockImplementation(async () => {
      const session = await mocks.getSession();
      return session ? { status: 'found', session } : { status: 'missing-cookie' };
    });
    mocks.deleteSession.mockResolvedValue('appointment_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax');
    mocks.getAppointmentSessionRequirements.mockResolvedValue({
      data: {
        data: {
          nextStep: 'DONE',
          needsUser: false,
          needsMobile: false,
          canAttachAuthenticatedUser: false,
        },
      },
    });
  });

  it('requires only an appointment session for pre-contact booking steps', async () => {
    const session = { sessionId: 's1', companyId: 1 };
    mocks.getSession.mockResolvedValue(session);

    const result = await requireBookingSession(new Request('http://localhost/x'));

    expect(result).toEqual({ session });
    expect(mocks.getAppointmentSessionRequirements).not.toHaveBeenCalled();
  });

  it('redirects to contact when booking requirements are not done', async () => {
    mocks.getSession.mockResolvedValue({ sessionId: 's1', companyId: 1 });
    mocks.getAppointmentSessionRequirements.mockResolvedValueOnce({
      data: {
        data: {
          nextStep: 'VERIFY_MOBILE',
          needsUser: false,
          needsMobile: true,
          canAttachAuthenticatedUser: false,
        },
      },
    });

    const result = await requireBookingReady(new Request('http://localhost/x'));

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get('Location')).toBe('/booking/public/appointment/session/contact');
  });

  it('returns session when booking requirements are done', async () => {
    const session = { sessionId: 's1', companyId: 1, userId: 10 };
    mocks.getSession.mockResolvedValue(session);

    const result = await requireBookingReady(new Request('http://localhost/x'));

    expect(mocks.getAppointmentSessionRequirements).toHaveBeenCalledWith({
      path: { sessionId: 's1' },
    });
    expect(result).toEqual({ session });
  });

  it('keeps the compatibility export mapped to the booking-ready guard', async () => {
    const session = { sessionId: 's1', companyId: 1, userId: 10 };
    mocks.getSession.mockResolvedValue(session);

    const result = await requireAuthenticatedBookingFlow(new Request('http://localhost/x'));

    expect(result).toEqual({ session });
  });

  it('clears stale appointment session cookie and restarts through the session route', async () => {
    mocks.getSessionResult.mockResolvedValue({ status: 'stale-cookie' });

    const result = await requireBookingReady(new Request('http://localhost/x'));

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get('Location')).toBe('/booking/public/appointment/session');
    expect((result as Response).headers.get('Set-Cookie')).toContain('appointment_session=');
  });
});
