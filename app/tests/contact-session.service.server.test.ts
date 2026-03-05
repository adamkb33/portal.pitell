import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionMock = vi.fn();
const getAuthMock = vi.fn();
const readVerificationTokenMock = vi.fn();
const getSessionUserStatusMock = vi.fn();

vi.mock('~/routes/booking/public/appointment/session/_services/appointment-session.service.server', () => ({
  AppointmentSessionService: {
    get: getSessionMock,
  },
}));

vi.mock('~/lib/auth-service', () => ({
  authService: {
    getAuth: getAuthMock,
  },
}));

vi.mock(
  '~/routes/booking/public/appointment/session/contact/_services/verification-token.service.server',
  () => ({
    VerificationTokenService: {
      readVerificationToken: readVerificationTokenMock,
    },
  }),
);

describe('ContactSessionService.getContactContext', () => {
  beforeEach(() => {
    getSessionMock.mockReset();
    getAuthMock.mockReset();
    readVerificationTokenMock.mockReset();
    getSessionUserStatusMock.mockReset();
  });

  it('does not resolve session user without auth or verification token', async () => {
    getSessionMock.mockResolvedValue({ id: 's-1' });
    getAuthMock.mockResolvedValue(null);
    readVerificationTokenMock.mockResolvedValue(null);

    const module = await import(
      '~/routes/booking/public/appointment/session/contact/_services/contact-session.service.server'
    );
    const spy = vi.spyOn(module.ContactSessionService, 'getSessionUserStatus').mockImplementation(getSessionUserStatusMock);

    const result = await module.ContactSessionService.getContactContext(new Request('http://localhost/test'));

    expect(result.sessionUser).toBeNull();
    expect(getSessionUserStatusMock).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
