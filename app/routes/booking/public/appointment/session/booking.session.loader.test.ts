import { describe, expect, it, vi, beforeEach } from 'vitest';
import { loader as sessionLoader } from './booking.public.appointment.session.route';

const mocks = vi.hoisted(() => ({
  getResult: vi.fn(),
  deleteSession: vi.fn(),
  createSession: vi.fn(),
  validateCompanyBooking: vi.fn(),
}));

vi.mock('~/routes/booking/public/_services/booking.appointment-session.service.server', () => ({
  AppointmentSessionService: {
    getResult: mocks.getResult,
    delete: mocks.deleteSession,
    create: mocks.createSession,
  },
}));

vi.mock('~/api/generated', () => ({
  AppointmentsController: {
    validateCompanyBooking: mocks.validateCompanyBooking,
  },
}));

import { parseBookingContext, serializeBookingContext } from '~/lib/booking-context.server';

async function parseBookingContextFromSetCookie(setCookieHeader: string | null) {
  const match = setCookieHeader?.match(/booking_context=([^;,]+)/);
  if (!match) return null;

  return parseBookingContext(
    new Request('https://portal.pitell.no/booking/public/appointment/session', {
      headers: {
        Cookie: `booking_context=${match[1]}`,
      },
    }),
  );
}

describe('booking session loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteSession.mockResolvedValue('appointment_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax');
    mocks.createSession.mockResolvedValue({
      session: { sessionId: 'new-session', companyId: 1 },
      setCookieHeader: 'appointment_session=new-session; Path=/; HttpOnly; SameSite=Lax',
    });
  });

  it('clears a stale cookie and creates a fresh session when companyId is present', async () => {
    mocks.getResult.mockResolvedValue({ status: 'stale-cookie' });

    const loader = sessionLoader;
    const result = await loader({
      request: new Request('https://portal.pitell.no/booking/public/appointment/session?companyId=1'),
    } as never);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get('Location')).toBe('/booking/public/appointment/session/employee');
    expect(mocks.deleteSession).toHaveBeenCalledOnce();
    expect(mocks.validateCompanyBooking).toHaveBeenCalledWith({ path: { companyId: 1 } });
    expect(mocks.createSession).toHaveBeenCalledWith(1, expect.any(Request));
    expect((result as Response).headers.get('Set-Cookie')).toContain('appointment_session=');
    expect((result as Response).headers.get('Set-Cookie')).toContain('booking_context=');
  });

  it('clears a stale cookie and redirects to booking start when companyId is missing', async () => {
    mocks.getResult.mockResolvedValue({ status: 'stale-cookie' });

    const loader = sessionLoader;
    const result = await loader({
      request: new Request('https://portal.pitell.no/booking/public/appointment/session'),
    } as never);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get('Location')).toBe('/booking/public/appointment');
    expect(mocks.deleteSession).toHaveBeenCalledOnce();
    expect(mocks.createSession).not.toHaveBeenCalled();
    expect((result as Response).headers.get('Set-Cookie')).toContain('appointment_session=');
  });

  it('uses booking_context companyId to recreate a stale session when query params are gone', async () => {
    mocks.getResult.mockResolvedValue({ status: 'stale-cookie' });
    const bookingContextCookie = await serializeBookingContext({
      companyId: 1,
      theme: 'fredrikstad-barbershop',
    });

    const loader = sessionLoader;
    const result = await loader({
      request: new Request('https://portal.pitell.no/booking/public/appointment/session', {
        headers: {
          Cookie: bookingContextCookie,
        },
      }),
    } as never);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get('Location')).toBe('/booking/public/appointment/session/employee');
    expect(mocks.validateCompanyBooking).toHaveBeenCalledWith({ path: { companyId: 1 } });
    expect(mocks.createSession).toHaveBeenCalledWith(1, expect.any(Request));
    expect((result as Response).headers.get('Set-Cookie')).toContain('appointment_session=');
    expect((result as Response).headers.get('Set-Cookie')).toContain('booking_context=');
  });

  it('stores a valid theme from the URL in booking_context', async () => {
    mocks.getResult.mockResolvedValue({ status: 'missing-cookie' });

    const result = await sessionLoader({
      request: new Request(
        'https://portal.pitell.no/booking/public/appointment/session?companyId=1&theme=fredrikstad-barbershop',
      ),
    } as never);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get('Location')).toBe('/booking/public/appointment/session/employee');
    expect((result as Response).headers.get('Set-Cookie')).toContain('booking_context=');
    await expect(parseBookingContextFromSetCookie((result as Response).headers.get('Set-Cookie'))).resolves.toEqual({
      companyId: 1,
      theme: 'fredrikstad-barbershop',
    });
  });

  it('rejects invalid theme from the URL', async () => {
    mocks.getResult.mockResolvedValue({ status: 'missing-cookie' });

    const result = await sessionLoader({
      request: new Request('https://portal.pitell.no/booking/public/appointment/session?companyId=1&theme=neon'),
    } as never);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get('Location')).toBe('/booking/public/appointment');
    expect(mocks.validateCompanyBooking).not.toHaveBeenCalled();
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it('resets an existing session when reset is requested', async () => {
    mocks.getResult.mockResolvedValue({ status: 'found', session: { sessionId: 'old-session', companyId: 1 } });

    const result = await sessionLoader({
      request: new Request('https://portal.pitell.no/booking/public/appointment/session?companyId=1&reset=1'),
    } as never);

    expect(result).toBeInstanceOf(Response);
    expect(mocks.deleteSession).toHaveBeenCalledOnce();
    expect(mocks.createSession).toHaveBeenCalledWith(1, expect.any(Request));
    expect((result as Response).headers.get('Set-Cookie')).toContain('appointment_session=');
  });
});
