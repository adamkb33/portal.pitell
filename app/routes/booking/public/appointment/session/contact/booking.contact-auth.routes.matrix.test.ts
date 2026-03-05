import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signInWithProvider: vi.fn(),
  signInLocal: vi.fn(),
  attachUserToSession: vi.fn(),
  resolvePostAuthRedirect: vi.fn(),
  signUp: vi.fn(),
  setPendingSessionUser: vi.fn(),
  completeProfile: vi.fn(),
  getSession: vi.fn(),
  accessSerialize: vi.fn(),
  refreshSerialize: vi.fn(),
  resolveErrorPayload: vi.fn(),
  redirectWithError: vi.fn(),
  redirectWithInfo: vi.fn(),
}));

vi.mock('~/routes/booking/public/appointment/session/contact/_services/contact-auth.service.server', () => ({
  ContactAuthService: {
    signInWithProvider: mocks.signInWithProvider,
    signInLocal: mocks.signInLocal,
    attachUserToSession: mocks.attachUserToSession,
    resolvePostAuthRedirect: mocks.resolvePostAuthRedirect,
    signUp: mocks.signUp,
    setPendingSessionUser: mocks.setPendingSessionUser,
    completeProfile: mocks.completeProfile,
  },
}));

vi.mock('~/routes/booking/public/appointment/session/_services/appointment-session.service.server', () => ({
  AppointmentSessionService: {
    get: mocks.getSession,
  },
}));

vi.mock('~/routes/auth/_features/auth.cookies.server', () => ({
  accessTokenCookie: { serialize: mocks.accessSerialize },
  refreshTokenCookie: { serialize: mocks.refreshSerialize },
}));

vi.mock('~/lib/api-error', () => ({
  resolveErrorPayload: mocks.resolveErrorPayload,
}));

vi.mock('~/routes/company/_lib/flash-message.server', () => ({
  redirectWithError: mocks.redirectWithError,
  redirectWithInfo: mocks.redirectWithInfo,
}));

import { ROUTES_MAP } from '~/lib/route-tree';
import { action as bookingSignInAction } from './sign-in/booking.public.appointment.session.contact.sign-in.route';
import { action as bookingSignUpAction } from './sign-up/booking.public.appointment.session.contact.sign-up.route';
import { action as bookingCollectEmailAction } from './collect-email/booking.public.appointment.session.contact.collect-email.route';
import { action as bookingCollectMobileAction } from './collect-mobile/booking.public.appointment.session.contact.collect-mobile.route';

function unwrapData<T = unknown>(result: unknown): T {
  if (result && typeof result === 'object' && 'data' in (result as Record<string, unknown>)) {
    return (result as { data: T }).data;
  }
  return result as T;
}

function getStatus(result: unknown): number | null {
  if (result && typeof result === 'object' && 'init' in (result as Record<string, unknown>)) {
    return ((result as { init?: { status?: number } | null }).init?.status ?? null) as number | null;
  }
  return result instanceof Response ? result.status : null;
}

function getLocation(result: unknown): string | null {
  if (result && typeof result === 'object' && 'init' in (result as Record<string, unknown>)) {
    const headers = (result as { init?: { headers?: Headers } | null }).init?.headers;
    return headers?.get('Location') ?? null;
  }
  return result instanceof Response ? result.headers.get('Location') : null;
}

describe('booking contact auth routes matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveErrorPayload.mockReturnValue({ message: 'fallback', status: 400 });
    mocks.redirectWithError.mockImplementation((_req: Request, href: string) => Response.redirect(href, 302));
    mocks.redirectWithInfo.mockImplementation((_req: Request, href: string) => Response.redirect(href, 302));
    mocks.resolvePostAuthRedirect.mockResolvedValue({
      nextStepHref: ROUTES_MAP['booking.public.appointment.session.employee'].href,
      verificationCookieHeader: null,
    });
    mocks.getSession.mockResolvedValue({
      sessionId: 's1',
      userId: 10,
    });
    mocks.accessSerialize.mockResolvedValue('access=1');
    mocks.refreshSerialize.mockResolvedValue('refresh=1');
  });

  describe('sign-in action', () => {
    it('returns error when Google idToken is missing', async () => {
      const formData = new FormData();
      formData.set('provider', 'GOOGLE');

      const result = await bookingSignInAction({
        request: new Request('http://localhost/booking/sign-in', { method: 'POST', body: formData }),
      } as never);

      expect(unwrapData(result)).toMatchObject({ error: 'Kunne ikke logge inn med Google. Prøv igjen.' });
      expect(getStatus(result)).toBe(400);
    });

    it.each([
      {
        name: 'local sign-in',
        form: { provider: 'LOCAL', email: 'user@example.com', password: 'secret' },
        response: {
          userId: 1,
          nextStep: 'DONE',
          authTokens: {
            accessToken: 'a',
            refreshToken: 'r',
            accessTokenExpiresAt: 1,
            refreshTokenExpiresAt: 2,
          },
        },
      },
      {
        name: 'google sign-in',
        form: { provider: 'GOOGLE', idToken: 'id-token' },
        response: {
          userId: 2,
          nextStep: 'VERIFY_EMAIL',
        },
      },
    ])('$name follows post-auth redirect', async ({ form, response }) => {
      if (form.provider === 'GOOGLE') {
        mocks.signInWithProvider.mockResolvedValueOnce(response);
      } else {
        mocks.signInLocal.mockResolvedValueOnce(response);
      }

      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.set(k, v));

      const result = await bookingSignInAction({
        request: new Request('http://localhost/booking/sign-in', { method: 'POST', body: formData }),
      } as never);

      expect(mocks.attachUserToSession).toHaveBeenCalledOnce();
      expect(getStatus(result)).toBe(302);
      expect(getLocation(result)).toBe(
        ROUTES_MAP['booking.public.appointment.session.employee'].href,
      );
    });
  });

  describe('sign-up action', () => {
    it('returns error payload when signup response is null', async () => {
      mocks.signUp.mockResolvedValueOnce(null);

      const formData = new FormData();
      formData.set('givenName', 'Ada');
      formData.set('familyName', 'Lovelace');
      formData.set('email', 'ada@example.com');
      formData.set('password', 'secret');
      formData.set('password2', 'secret');
      formData.set('mobileNumber', '+4712345678');

      const result = await bookingSignUpAction({
        request: new Request('http://localhost/booking/sign-up', { method: 'POST', body: formData }),
      } as never);

      expect(unwrapData(result)).toMatchObject({ error: 'Kunne ikke opprette konto. Prøv igjen.' });
      expect(getStatus(result)).toBe(400);
    });

    it('sets pending user and redirects to next step when signup succeeds', async () => {
      mocks.signUp.mockResolvedValueOnce({
        userId: 10,
        nextStep: 'VERIFY_EMAIL',
        authTokens: {
          accessToken: 'a',
          refreshToken: 'r',
          accessTokenExpiresAt: 1,
          refreshTokenExpiresAt: 2,
        },
      });
      mocks.setPendingSessionUser.mockResolvedValueOnce({ ok: true });
      mocks.resolvePostAuthRedirect.mockResolvedValueOnce({
        nextStepHref: ROUTES_MAP['booking.public.appointment.session.contact.verify-email'].href,
        verificationCookieHeader: 'verification=1',
      });

      const formData = new FormData();
      formData.set('givenName', 'Ada');
      formData.set('familyName', 'Lovelace');
      formData.set('email', 'ada@example.com');
      formData.set('password', 'secret');
      formData.set('password2', 'secret');
      formData.set('mobileNumber', '+4712345678');
      formData.set('redirectUrl', 'booking');

      const result = await bookingSignUpAction({
        request: new Request('http://localhost/booking/sign-up', { method: 'POST', body: formData }),
      } as never);

      expect(mocks.setPendingSessionUser).toHaveBeenCalledWith('s1', 10);
      expect(getStatus(result)).toBe(302);
      expect(getLocation(result)).toBe(
        ROUTES_MAP['booking.public.appointment.session.contact.verify-email'].href,
      );
    });
  });

  describe('collect profile routes', () => {
    it.each([
      {
        name: 'collect email',
        actionFn: bookingCollectEmailAction,
        field: 'email',
        value: 'user@example.com',
      },
      {
        name: 'collect mobile',
        actionFn: bookingCollectMobileAction,
        field: 'mobileNumber',
        value: '+4712345678',
      },
    ])('$name resolves next step redirect', async ({ actionFn, field, value }) => {
      mocks.completeProfile.mockResolvedValueOnce({
        userId: 10,
        nextStep: 'DONE',
      });
      mocks.resolvePostAuthRedirect.mockResolvedValueOnce({
        nextStepHref: ROUTES_MAP['booking.public.appointment.session.employee'].href,
        verificationCookieHeader: null,
      });

      const formData = new FormData();
      formData.set(field, value);

      const result = await actionFn({
        request: new Request('http://localhost/booking/collect', { method: 'POST', body: formData }),
      } as never);

      expect(mocks.completeProfile).toHaveBeenCalledOnce();
      expect(getStatus(result)).toBe(302);
      expect(getLocation(result)).toBe(
        ROUTES_MAP['booking.public.appointment.session.employee'].href,
      );
    });
  });
});
