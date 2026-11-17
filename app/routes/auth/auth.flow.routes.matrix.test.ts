import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  getCompanyContexts: vi.fn(),
  companySignIn: vi.fn(),
  getCompanyIdFromToken: vi.fn(),
  signUp: vi.fn(),
  verificationStatus: vi.fn(),
  resendVerificationMobileOnly: vi.fn(),
  verifyEmail: vi.fn(),
  verifyMobile: vi.fn(),
  providerCompleteProfile: vi.fn(),
  setAuthCookies: vi.fn(),
  resolveErrorPayload: vi.fn(),
  redirectWithError: vi.fn(),
  redirectWithWarning: vi.fn(),
  redirectWithSuccess: vi.fn(),
  setFlashMessage: vi.fn(),
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

vi.mock('~/api/generated', () => ({
  AuthController: {
    signIn: mocks.signIn,
    getCompanyContexts: mocks.getCompanyContexts,
    companySignIn: mocks.companySignIn,
    signUp: mocks.signUp,
    verificationStatus: mocks.verificationStatus,
    resendVerificationMobileOnly: mocks.resendVerificationMobileOnly,
    verifyEmail: mocks.verifyEmail,
    verifyMobile: mocks.verifyMobile,
    providerCompleteProfile: mocks.providerCompleteProfile,
  },
}));

vi.mock('~/lib/auth-service', () => ({
  authService: {
    setAuthCookies: mocks.setAuthCookies,
    getCompanyIdFromToken: mocks.getCompanyIdFromToken,
  },
}));

vi.mock('~/lib/api-error', () => ({
  resolveErrorPayload: mocks.resolveErrorPayload,
}));

vi.mock('~/lib/flash-message.server', () => ({
  redirectWithError: mocks.redirectWithError,
  redirectWithWarning: mocks.redirectWithWarning,
  redirectWithSuccess: mocks.redirectWithSuccess,
  setFlashMessage: mocks.setFlashMessage,
}));

vi.mock('~/routes/booking/public/appointment/session/contact/_services/verification-token.service.server', () => ({
  parseVerificationExpiry: (value?: string | null) => (value ? new Date(`${value}Z`) : undefined),
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

import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { accessTokenCookie } from './_features/auth.cookies.server';
import { action as signInAction } from './sign-in/auth.sign-in.route';
import { action as signUpAction } from './sign-up/auth.sign-up.route';
import { loader as verifyEmailLoader } from './verify-email/auth.verify-email.route';
import { loader as verifyMobileLoader, action as verifyMobileAction } from './verify-mobile/auth.verify-mobile.route';
import { loader as collectEmailLoader, action as collectEmailAction } from './collect-email/auth.collect-email.route';
import {
  loader as collectMobileLoader,
  action as collectMobileAction,
} from './collect-mobile/auth.collect-mobile.route';

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
    mocks.redirectWithError.mockImplementation(
      (_request: Request, href: string) => new Response(null, { status: 302, headers: { Location: href } }),
    );
    mocks.redirectWithSuccess.mockImplementation(
      (_request: Request, href: string) => new Response(null, { status: 302, headers: { Location: href } }),
    );
    mocks.setFlashMessage.mockResolvedValue('__flash=1');
    mocks.setAuthCookies.mockResolvedValue(new Headers([['Set-Cookie', 'auth=1']]));
    mocks.getCompanyIdFromToken.mockReturnValue(undefined);
    mocks.getCompanyContexts.mockResolvedValue({ data: { data: [] } });
    mocks.companySignIn.mockResolvedValue({ data: { data: null } });
    mocks.readVerificationToken.mockResolvedValue('vt-1');
    mocks.buildVerificationCookieHeader.mockResolvedValue('verification=vt-2');
    mocks.buildVerificationCookieHeaderFromDto.mockResolvedValue('verification=vt-2');
    mocks.getVerificationTokenFromRequest.mockResolvedValue('vt-1');
    mocks.requireVerificationToken.mockResolvedValue('vt-1');
    mocks.serializeVerificationSessionToken.mockResolvedValue('verification=vt-serialized');
  });

  describe('sign-in action', () => {
    it('redirects with an error when google id token is missing', async () => {
      const formData = new FormData();
      formData.set('provider', 'GOOGLE');

      const result = await signInAction({
        request: new Request('http://localhost/auth/sign-in', { method: 'POST', body: formData }),
      } as never);

      expect(mocks.redirectWithError).toHaveBeenCalledWith(
        expect.any(Request),
        ROUTES_MAP['auth.sign-in'].href,
        'Kunne ikke logge inn med Google. Prøv igjen.',
      );
      expect(getStatus(result)).toBe(302);
    });

    it.each([
      {
        name: 'done for a customer without a company goes to Mine bookinger',
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
        expectedLocation: ROUTES_MAP['booking.public.my-appointments'].href,
      },
      {
        name: 'done with multiple company contexts redirects to company-context page',
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
        setup: () => {
          mocks.getCompanyContexts.mockResolvedValueOnce({
            data: {
              data: [
                { id: 10, orgNumber: '111', name: 'A' },
                { id: 20, orgNumber: '222', name: 'B' },
              ],
            },
          });
        },
        expectedLocation: ROUTES_MAP['user.company-context'].href,
      },
      {
        name: 'done with one company context auto-signs company and redirects home',
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
        setup: () => {
          mocks.getCompanyContexts.mockResolvedValueOnce({
            data: { data: [{ id: 99, orgNumber: '999', name: 'Single Co' }] },
          });
          mocks.companySignIn.mockResolvedValueOnce({
            data: {
              data: {
                accessToken: 'ca',
                refreshToken: 'cr',
                accessTokenExpiresAt: 11,
                refreshTokenExpiresAt: 22,
              },
            },
          });
        },
        expectedLocation: '/',
      },
      {
        name: 'verify mobile goes to the code step',
        payload: {
          nextStep: 'VERIFY_MOBILE',
          userId: 1,
          verificationToken: { value: 'vt-1', expiresAt: '2030-01-01T00:00:00' },
          mobileDelivery: { status: 'SENT' },
        },
        expectedLocation: ROUTES_MAP['auth.verify-mobile'].href,
      },
    ])('$name', async ({ payload, expectedLocation, setup }) => {
      setup?.();
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

    it('skips company context lookup when access token already has company context', async () => {
      mocks.getCompanyIdFromToken.mockReturnValueOnce('42');
      mocks.signIn.mockResolvedValueOnce({
        data: {
          data: {
            nextStep: 'DONE',
            userId: 1,
            authTokens: {
              accessToken: 'a',
              refreshToken: 'r',
              accessTokenExpiresAt: 1,
              refreshTokenExpiresAt: 2,
            },
          },
        },
      });

      const formData = new FormData();
      formData.set('provider', 'LOCAL');
      formData.set('email', 'user@example.com');
      formData.set('password', 'secret');

      const result = await signInAction({
        request: new Request('http://localhost/auth/sign-in', { method: 'POST', body: formData }),
      } as never);

      expect(getStatus(result)).toBe(302);
      expect(getLocation(result)).toBe('/');
      expect(mocks.getCompanyContexts).not.toHaveBeenCalled();
      expect(mocks.companySignIn).not.toHaveBeenCalled();
    });
  });

  describe('sign-up action', () => {
    function signUpForm(overrides: Partial<Record<string, string>> = {}) {
      const formData = new FormData();
      const values = {
        givenName: 'Ada',
        familyName: 'Lovelace',
        mobileNumber: '912 34 567',
        email: '',
        password: 'secret12',
        ...overrides,
      };
      Object.entries(values).forEach(([key, value]) => formData.set(key, value ?? ''));
      return formData;
    }

    it('sends the new account to the code step with auth cookies and the number for "Sendt på SMS til"', async () => {
      mocks.signUp.mockResolvedValueOnce({
        data: {
          data: {
            userId: 2,
            nextStep: 'VERIFY_MOBILE',
            authTokens: {
              accessToken: 'a',
              refreshToken: 'r',
              accessTokenExpiresAt: 1,
              refreshTokenExpiresAt: 2,
            },
            verificationToken: { value: 'vt-1', expiresAt: '2030-01-01T00:00:00.000Z' },
            emailDelivery: { status: 'NOT_ATTEMPTED' },
            mobileDelivery: { status: 'SENT' },
          },
        },
      });

      const result = await signUpAction({
        request: new Request('http://localhost/auth/sign-up', { method: 'POST', body: signUpForm() }),
      } as never);

      expect(getStatus(result)).toBe(302);
      expect(getLocation(result)).toBe(ROUTES_MAP['auth.verify-mobile'].href);
      expect(mocks.setAuthCookies).toHaveBeenCalledOnce();
      expect(mocks.signUp).toHaveBeenCalledWith({
        body: {
          givenName: 'Ada',
          familyName: 'Lovelace',
          mobileNumber: '912 34 567',
          email: undefined,
          password: 'secret12',
          password2: 'secret12',
        },
      });
      const cookies = (result as Response).headers.get('Set-Cookie') ?? '';
      expect(cookies).toContain('sign_in_flow=');
    });

    it.each([
      { overrides: { givenName: '' }, text: 'Skriv inn fornavn.' },
      { overrides: { mobileNumber: '' }, text: 'Skriv inn mobilnummer.' },
      { overrides: { email: 'ada@' }, text: 'Skriv inn en gyldig e-postadresse.' },
      { overrides: { password: 'kort' }, text: 'Passordet må ha minst 8 tegn.' },
    ])('stays on the page with a toast when $text', async ({ overrides, text }) => {
      const result = await signUpAction({
        request: new Request('http://localhost/auth/sign-up', { method: 'POST', body: signUpForm(overrides) }),
      } as never);

      expect(getStatus(result)).toBe(400);
      expect(mocks.signUp).not.toHaveBeenCalled();
      expect(mocks.setFlashMessage).toHaveBeenCalledWith(expect.any(Request), { type: 'error', text });
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
      expect(mocks.redirectWithSuccess).toHaveBeenCalledWith(
        expect.any(Request),
        expect.any(String),
        'E-post bekreftet',
        expect.any(Headers),
      );
    });

    it('signs a customer straight in to Mine bookinger with the toast when nothing else is needed', async () => {
      mocks.verifyEmail.mockResolvedValueOnce({
        data: {
          data: {
            nextStep: 'DONE',
            authTokens: { accessToken: 'a', refreshToken: 'r', accessTokenExpiresAt: 1, refreshTokenExpiresAt: 2 },
          },
        },
      });

      const result = await verifyEmailLoader({
        request: new Request('http://localhost/auth/verify-email?token=t'),
      } as never);

      expect((result as Response).headers.get('Location')).toBe(ROUTES_MAP['booking.public.my-appointments'].href);
      expect(mocks.setAuthCookies).toHaveBeenCalledOnce();
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
        expected: { ok: true, message: 'Ny kode sendt.' },
      },
      {
        name: 'verify with tokens signs a customer in to Mine bookinger',
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
        expectedLocation: ROUTES_MAP['booking.public.my-appointments'].href,
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
    ])(
      'signed out goes to sign-in; signed in saves on the signed-in account ($field)',
      async ({ loader, action, field, value }) => {
        const loaderResult = await loader({
          request: new Request('http://localhost/auth/collect'),
        } as never);
        expect(loaderResult).toBeInstanceOf(Response);
        expect((loaderResult as Response).headers.get('Location')).toBe(ROUTES_MAP['auth.sign-in'].href);

        const signedOutForm = new FormData();
        signedOutForm.set(field, value);
        const signedOutResult = await action({
          request: new Request('http://localhost/auth/collect', { method: 'POST', body: signedOutForm }),
        } as never);
        expect(getLocation(signedOutResult)).toBe(ROUTES_MAP['auth.sign-in'].href);
        expect(mocks.providerCompleteProfile).not.toHaveBeenCalled();

        const cookie = (await accessTokenCookie.serialize('access-token')).split(';')[0];
        expect(
          await loader({ request: new Request('http://localhost/auth/collect', { headers: { cookie } }) } as never),
        ).toBeNull();

        mocks.providerCompleteProfile.mockResolvedValueOnce({
          data: { data: { userId: 1, nextStep: 'DONE' } },
        });

        const formData = new FormData();
        formData.set(field, value);

        const actionResult = await action({
          request: new Request('http://localhost/auth/collect', {
            method: 'POST',
            body: formData,
            headers: { cookie },
          }),
        } as never);
        expect(mocks.providerCompleteProfile).toHaveBeenCalledWith({ body: { [field]: value } });
        expect(getStatus(actionResult)).toBe(302);
        expect(getLocation(actionResult)).toBe('/');
      },
    );
  });
});
