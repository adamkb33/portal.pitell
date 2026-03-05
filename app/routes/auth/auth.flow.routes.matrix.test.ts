import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  verificationStatus: vi.fn(),
  resendVerificationEmailOnly: vi.fn(),
  resendVerificationMobileOnly: vi.fn(),
  verifyEmail: vi.fn(),
  verifyMobile: vi.fn(),
  providerCompleteProfile: vi.fn(),
  setAuthCookies: vi.fn(),
  resolveErrorPayload: vi.fn(),
  redirectWithWarning: vi.fn(),
  readVerificationToken: vi.fn(),
  buildVerificationCookieHeader: vi.fn(),
  buildVerificationCookieHeaderFromDto: vi.fn(),
  getVerificationTokenFromRequest: vi.fn(),
  requireVerificationToken: vi.fn(),
  serializeVerificationSessionToken: vi.fn(),
  loggerInfo: vi.fn(),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('~/api/generated/base', () => ({
  AuthController: {
    signIn: mocks.signIn,
    signUp: mocks.signUp,
    verificationStatus: mocks.verificationStatus,
    resendVerificationEmailOnly: mocks.resendVerificationEmailOnly,
    resendVerificationMobileOnly: mocks.resendVerificationMobileOnly,
    verifyEmail: mocks.verifyEmail,
    verifyMobile: mocks.verifyMobile,
    providerCompleteProfile: mocks.providerCompleteProfile,
  },
}));

vi.mock('~/lib/auth-service', () => ({
  authService: {
    setAuthCookies: mocks.setAuthCookies,
  },
}));

vi.mock('~/lib/api-error', () => ({
  resolveErrorPayload: mocks.resolveErrorPayload,
}));

vi.mock('~/routes/company/_lib/flash-message.server', () => ({
  redirectWithWarning: mocks.redirectWithWarning,
}));

vi.mock('~/routes/booking/public/appointment/session/contact/_services/verification-token.service.server', () => ({
  VerificationTokenService: {
    readVerificationToken: mocks.readVerificationToken,
    buildVerificationCookieHeader: mocks.buildVerificationCookieHeader,
    buildVerificationCookieHeaderFromDto: mocks.buildVerificationCookieHeaderFromDto,
  },
}));

vi.mock('~/routes/booking/public/appointment/session/contact/_utils/auth.utils.server', () => ({
  getVerificationTokenFromRequest: mocks.getVerificationTokenFromRequest,
  requireVerificationToken: mocks.requireVerificationToken,
}));

vi.mock('~/lib/auth.server', () => ({
  verificationSessionToken: {
    serialize: mocks.serializeVerificationSessionToken,
  },
}));

vi.mock('~/lib/logger', () => ({
  logger: {
    info: mocks.loggerInfo,
    warn: mocks.loggerWarn,
    error: mocks.loggerError,
  },
}));

import { ROUTES_MAP } from '~/lib/route-tree';
import { action as signInAction } from './sign-in/auth.sign-in.route';
import { action as signUpAction } from './sign-up/auth.sign-up.route';
import { loader as checkEmailLoader, action as checkEmailAction } from './check-email/auth.check-email.route';
import { loader as verifyEmailLoader } from './verify-email/auth.verify-email.route';
import { loader as verifyMobileLoader, action as verifyMobileAction } from './verify-mobile/auth.verify-mobile.route';
import { loader as collectEmailLoader, action as collectEmailAction } from './collect-email/auth.collect-email.route';
import { loader as collectMobileLoader, action as collectMobileAction } from './collect-mobile/auth.collect-mobile.route';

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

describe('auth flow routes matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveErrorPayload.mockReturnValue({ message: 'fallback error', status: 400 });
    mocks.redirectWithWarning.mockImplementation(
      (_request: Request, href: string) => new Response(null, { status: 302, headers: { Location: href } }),
    );
    mocks.setAuthCookies.mockResolvedValue(new Headers([['Set-Cookie', 'auth=1']]));
    mocks.readVerificationToken.mockResolvedValue('vt-1');
    mocks.buildVerificationCookieHeader.mockResolvedValue('verification=vt-2');
    mocks.buildVerificationCookieHeaderFromDto.mockResolvedValue('verification=vt-2');
    mocks.getVerificationTokenFromRequest.mockResolvedValue('vt-1');
    mocks.requireVerificationToken.mockResolvedValue('vt-1');
    mocks.serializeVerificationSessionToken.mockResolvedValue('verification=vt-serialized');
  });

  describe('sign-in action', () => {
    it('returns 400 when google id token is missing', async () => {
      const formData = new FormData();
      formData.set('provider', 'GOOGLE');

      const result = await signInAction({
        request: new Request('http://localhost/auth/sign-in', { method: 'POST', body: formData }),
      } as never);

      expect(unwrapData(result)).toMatchObject({ error: 'Kunne ikke logge inn med Google. Prøv igjen.' });
      expect(getStatus(result)).toBe(400);
    });

    it.each([
      {
        name: 'done with auth tokens redirects home',
        payload: {
          nextStep: 'DONE',
          userId: 1,
          authTokens: {
            accessToken: 'a',
            refreshToken: 'r',
            accessTokenExpiresAt: 1,
            refreshTokenExpiresAt: 2,
          },
        },
        expectedLocation: '/',
      },
      {
        name: 'verify email redirects to check-email',
        payload: {
          nextStep: 'VERIFY_EMAIL',
          userId: 1,
          verificationToken: { value: 'vt-1', expiresAt: '2030-01-01T00:00:00.000Z' },
          emailDelivery: { status: 'SENT' },
          mobileDelivery: { status: 'NOT_ATTEMPTED' },
        },
        expectedLocation: '/auth/check-email?emailDelivery=SENT&mobileDelivery=NOT_ATTEMPTED',
      },
    ])('$name', async ({ payload, expectedLocation }) => {
      mocks.signIn.mockResolvedValueOnce({ data: { data: payload } });

      const formData = new FormData();
      formData.set('provider', 'LOCAL');
      formData.set('email', 'user@example.com');
      formData.set('password', 'secret');

      const result = await signInAction({
        request: new Request('http://localhost/auth/sign-in', { method: 'POST', body: formData }),
      } as never);

      expect(getStatus(result)).toBe(302);
      expect(getLocation(result)).toBe(expectedLocation);
    });

    it('falls back to redirectWithWarning when nextStep is missing', async () => {
      mocks.signIn.mockResolvedValueOnce({ data: { data: { userId: 1 } } });

      const formData = new FormData();
      formData.set('provider', 'LOCAL');
      formData.set('email', 'user@example.com');
      formData.set('password', 'secret');

      const result = await signInAction({
        request: new Request('http://localhost/auth/sign-in', { method: 'POST', body: formData }),
      } as never);

      expect(mocks.redirectWithWarning).toHaveBeenCalledOnce();
      expect(getStatus(result)).toBe(302);
    });
  });

  describe('sign-up action', () => {
    it('redirects to next step and sets auth cookies when tokens are present', async () => {
      mocks.signUp.mockResolvedValueOnce({
        data: {
          data: {
            userId: 2,
            nextStep: 'VERIFY_EMAIL',
            authTokens: {
              accessToken: 'a',
              refreshToken: 'r',
              accessTokenExpiresAt: 1,
              refreshTokenExpiresAt: 2,
            },
            verificationToken: { value: 'vt-1', expiresAt: '2030-01-01T00:00:00.000Z' },
            emailDelivery: { status: 'SENT' },
            mobileDelivery: { status: 'NOT_ATTEMPTED' },
          },
        },
      });

      const formData = new FormData();
      formData.set('givenName', 'Ada');
      formData.set('familyName', 'Lovelace');
      formData.set('email', 'ada@example.com');
      formData.set('password', 'secret');
      formData.set('password2', 'secret');

      const result = await signUpAction({
        request: new Request('http://localhost/auth/sign-up', { method: 'POST', body: formData }),
      } as never);

      expect(getStatus(result)).toBe(302);
      expect(getLocation(result)).toBe(
        '/auth/check-email?emailDelivery=SENT&mobileDelivery=NOT_ATTEMPTED',
      );
      expect(mocks.setAuthCookies).toHaveBeenCalledOnce();
    });
  });

  describe('check-email loader/action', () => {
    it('loader parses delivery params and reads status', async () => {
      mocks.verificationStatus.mockResolvedValueOnce({
        data: { data: { nextStep: 'VERIFY_EMAIL' } },
      });

      const result = await checkEmailLoader({
        request: new Request(
          'http://localhost/auth/check-email?emailDelivery=SENT&mobileDelivery=FAILED',
        ),
      } as never);

      expect(unwrapData(result)).toMatchObject({
        emailDelivery: 'SENT',
        mobileDelivery: 'FAILED',
        verificationSessionToken: 'vt-1',
        nextStep: 'VERIFY_EMAIL',
      });
    });

    it('action returns resend payload with delivery statuses', async () => {
      mocks.resendVerificationEmailOnly.mockResolvedValueOnce({
        data: {
          message: { value: 'sent' },
          data: {
            verificationToken: { value: 'vt-2', expiresAt: '2030-01-01T00:00:00.000Z' },
            emailDelivery: { status: 'SENT' },
            mobileDelivery: { status: 'NOT_ATTEMPTED' },
          },
        },
      });

      const result = await checkEmailAction({
        request: new Request('http://localhost/auth/check-email', { method: 'POST' }),
      } as never);

      expect(unwrapData(result)).toMatchObject({
        success: true,
        message: 'sent',
        emailDelivery: 'SENT',
        mobileDelivery: 'NOT_ATTEMPTED',
      });
    });
  });

  describe('verify-email loader', () => {
    it('redirects to sign-in when token is missing', async () => {
      const result = await verifyEmailLoader({
        request: new Request('http://localhost/auth/verify-email'),
      } as never);
      expect(result).toBeInstanceOf(Response);
      expect((result as Response).headers.get('Location')).toBe(ROUTES_MAP['auth.sign-in'].href);
    });

    it('redirects to verify-mobile on VERIFY_MOBILE nextStep', async () => {
      mocks.verifyEmail.mockResolvedValueOnce({
        data: {
          data: {
            nextStep: 'VERIFY_MOBILE',
            verificationToken: { value: 'vt-1', expiresAt: '2030-01-01T00:00:00.000Z' },
          },
        },
      });

      const result = await verifyEmailLoader({
        request: new Request('http://localhost/auth/verify-email?token=t'),
      } as never);

      expect(result).toBeInstanceOf(Response);
      expect((result as Response).headers.get('Location')).toBe(
        `${ROUTES_MAP['auth.verify-mobile'].href}?verificationSessionToken=vt-1`,
      );
    });
  });

  describe('verify-mobile loader/action', () => {
    it('loader redirects when status nextStep is not VERIFY_MOBILE', async () => {
      mocks.verificationStatus.mockResolvedValueOnce({
        data: { data: { nextStep: 'DONE', emailVerified: true, mobileRequired: true, mobileVerified: true } },
      });

      const result = await verifyMobileLoader({
        request: new Request('http://localhost/auth/verify-mobile'),
      } as never);

      expect(result).toBeInstanceOf(Response);
      expect((result as Response).headers.get('Location')).toBe('/');
    });

    it.each([
      {
        name: 'resend intent returns message payload',
        form: { intent: 'resend' },
        mockResponse: {
          data: {
            message: { value: 'resent' },
            data: { verificationToken: { value: 'vt-2', expiresAt: '2030-01-01T00:00:00.000Z' } },
          },
        },
        expected: { message: 'resent' },
      },
      {
        name: 'verify with tokens redirects home',
        form: { intent: 'verify', code: '123456' },
        mockResponse: {
          data: {
            data: {
              nextStep: 'DONE',
              authTokens: {
                accessToken: 'a',
                refreshToken: 'r',
                accessTokenExpiresAt: 1,
                refreshTokenExpiresAt: 2,
              },
            },
          },
        },
        expectedLocation: '/',
      },
    ])('$name', async ({ form, mockResponse, expected, expectedLocation }) => {
      if (form.intent === 'resend') {
        mocks.resendVerificationMobileOnly.mockResolvedValueOnce(mockResponse);
      } else {
        mocks.verifyMobile.mockResolvedValueOnce(mockResponse);
      }

      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.set(key, value));

      const result = await verifyMobileAction({
        request: new Request('http://localhost/auth/verify-mobile', { method: 'POST', body: formData }),
      } as never);

      if (expectedLocation) {
        expect(getStatus(result)).toBe(302);
        expect(getLocation(result)).toBe(expectedLocation);
      } else {
        expect(unwrapData(result)).toMatchObject(expected as object);
      }
    });
  });

  describe('collect-email/mobile routes', () => {
    it.each([
      { loader: collectEmailLoader, action: collectEmailAction, field: 'email', value: 'user@example.com' },
      { loader: collectMobileLoader, action: collectMobileAction, field: 'mobileNumber', value: '+4712345678' },
    ])('loader redirects without valid userId and action handles provider complete profile ($field)', async ({
      loader,
      action,
      field,
      value,
    }) => {
      const loaderResult = await loader({
        request: new Request('http://localhost/auth/collect?userId='),
      } as never);
      expect(loaderResult).toBeInstanceOf(Response);
      expect((loaderResult as Response).headers.get('Location')).toBe(ROUTES_MAP['auth.sign-in'].href);

      mocks.providerCompleteProfile.mockResolvedValueOnce({
        data: { data: { userId: 1, nextStep: 'DONE' } },
      });

      const formData = new FormData();
      formData.set('userId', '1');
      formData.set(field, value);

      const actionResult = await action({
        request: new Request('http://localhost/auth/collect', { method: 'POST', body: formData }),
      } as never);
      expect(getStatus(actionResult)).toBe(302);
      expect(getLocation(actionResult)).toBe('/');
    });
  });
});
