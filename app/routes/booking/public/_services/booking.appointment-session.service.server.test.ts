import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAppointmentSession: vi.fn(),
  getAppointmentSession: vi.fn(),
  deleteAppointmentSession: vi.fn(),
}));

vi.mock('~/api/generated', () => ({
  PublicAppointmentSessionController: {
    createAppointmentSession: mocks.createAppointmentSession,
    getAppointmentSession: mocks.getAppointmentSession,
    deleteAppointmentSession: mocks.deleteAppointmentSession,
  },
}));

import { AppointmentSessionService } from './booking.appointment-session.service.server';

describe('AppointmentSessionService cookie policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createAppointmentSession.mockResolvedValue({
      data: {
        data: {
          sessionId: 'session-123',
          companyId: 1,
        },
      },
    });
    mocks.getAppointmentSession.mockResolvedValue({
      data: {
        data: {
          sessionId: 'session-123',
          companyId: 1,
        },
      },
    });
  });

  it('sets first-party appointment session cookie attributes', async () => {
    const result = await AppointmentSessionService.create(
      1,
      new Request('https://portal.pitell.no/booking/public/appointment/session?companyId=1'),
    );

    expect(result.setCookieHeader).toContain('appointment_session=');
    expect(result.setCookieHeader).toContain('Path=/');
    expect(result.setCookieHeader).toContain('HttpOnly');
    expect(result.setCookieHeader).toContain('SameSite=Lax');
    expect(result.setCookieHeader).not.toContain('SameSite=None');
    expect(result.setCookieHeader).toContain('Max-Age=86400');
  });

  it('clears the appointment session cookie with first-party attributes', async () => {
    const setCookieHeader = await AppointmentSessionService.delete(
      new Request('https://portal.pitell.no/booking/public/appointment/session?companyId=1&reset=1'),
    );

    expect(setCookieHeader).toContain('appointment_session=');
    expect(setCookieHeader).toContain('Path=/');
    expect(setCookieHeader).toContain('HttpOnly');
    expect(setCookieHeader).toContain('SameSite=Lax');
    expect(setCookieHeader).not.toContain('SameSite=None');
    expect(setCookieHeader).toContain('Max-Age=0');
  });

  it('returns stale-cookie when backend reports SESSION_NOT_FOUND', async () => {
    mocks.getAppointmentSession.mockResolvedValueOnce({
      error: {
        message: {
          id: 'SESSION_NOT_FOUND',
          value: 'Session not found',
        },
      },
      response: {
        status: 404,
      },
    });

    const cookie = await AppointmentSessionService.create(
      1,
      new Request('https://portal.pitell.no/booking/public/appointment/session?companyId=1'),
    );
    const result = await AppointmentSessionService.getResult(
      new Request('https://portal.pitell.no/booking/public/appointment/session/contact', {
        headers: {
          Cookie: cookie.setCookieHeader,
        },
      }),
    );

    expect(result.status).toBe('stale-cookie');
  });

  it('returns stale-cookie when the generated client throws SESSION_NOT_FOUND with status 400', async () => {
    mocks.getAppointmentSession.mockRejectedValueOnce({
      message: 'Request failed with status code 400',
      response: {
        status: 400,
        data: {
          success: false,
          message: {
            id: 'SESSION_NOT_FOUND',
            value: 'Sesjonen finnes ikke',
          },
        },
      },
    });

    const cookie = await AppointmentSessionService.create(
      1,
      new Request('https://portal.pitell.no/booking/public/appointment/session?companyId=1'),
    );
    const result = await AppointmentSessionService.getResult(
      new Request('https://portal.pitell.no/booking/public/appointment/session', {
        headers: {
          Cookie: cookie.setCookieHeader,
        },
      }),
    );

    expect(result.status).toBe('stale-cookie');
  });

  it('returns stale-cookie when an Axios-like Error carries SESSION_NOT_FOUND response data', async () => {
    const axiosLikeError = Object.assign(new Error('Request failed with status code 400'), {
      response: {
        status: 400,
        data: {
          success: false,
          message: {
            id: 'SESSION_NOT_FOUND',
            value: 'Sesjonen finnes ikke',
          },
        },
      },
    });
    mocks.getAppointmentSession.mockRejectedValueOnce(axiosLikeError);

    const cookie = await AppointmentSessionService.create(
      1,
      new Request('https://portal.pitell.no/booking/public/appointment/session?companyId=1'),
    );
    const result = await AppointmentSessionService.getResult(
      new Request('https://portal.pitell.no/booking/public/appointment/session', {
        headers: {
          Cookie: cookie.setCookieHeader,
        },
      }),
    );

    expect(result.status).toBe('stale-cookie');
  });

  it('returns found when backend resolves the cookie session', async () => {
    const cookie = await AppointmentSessionService.create(
      1,
      new Request('https://portal.pitell.no/booking/public/appointment/session?companyId=1'),
    );
    const result = await AppointmentSessionService.getResult(
      new Request('https://portal.pitell.no/booking/public/appointment/session/contact', {
        headers: {
          Cookie: cookie.setCookieHeader,
        },
      }),
    );

    expect(result).toMatchObject({
      status: 'found',
      session: {
        sessionId: 'session-123',
        companyId: 1,
      },
    });
  });
});
