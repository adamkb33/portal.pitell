import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  verifyMobile: vi.fn(),
  resendVerification: vi.fn(),
  getUserStatus: vi.fn(),
  readVerificationToken: vi.fn(),
  buildVerificationCookieHeader: vi.fn(),
  setFlashMessage: vi.fn(),
  resolveErrorPayload: vi.fn(),
}));

vi.mock('~/routes/booking/public/appointment/session/contact/_services/contact-auth.service.server', () => ({
  ContactAuthService: {
    verifyMobile: mocks.verifyMobile,
    resendVerification: mocks.resendVerification,
    getUserStatus: mocks.getUserStatus,
  },
}));

vi.mock('~/routes/booking/public/appointment/session/contact/_services/verification-token.service.server', () => ({
  VerificationTokenService: {
    readVerificationToken: mocks.readVerificationToken,
    buildVerificationCookieHeader: mocks.buildVerificationCookieHeader,
  },
}));

vi.mock('~/routes/company/_lib/flash-message.server', () => ({
  setFlashMessage: mocks.setFlashMessage,
}));

vi.mock('~/lib/api-error', () => ({
  resolveErrorPayload: mocks.resolveErrorPayload,
}));

import { action as verifyMobileAction } from './verify-mobile/auth.verify-mobile.api-route';
import { action as resendEmailAction } from './resend-verification/email/auth.resend-verification.email.api-route';
import { action as resendMobileAction } from './resend-verification/mobile/auth.resend-verification.mobile.api-route';
import { loader as userStatusLoader } from './user-status/auth.user-status.api-route';

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

describe('booking auth api routes matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readVerificationToken.mockResolvedValue('vt-1');
    mocks.buildVerificationCookieHeader.mockResolvedValue('verification=vt-2');
    mocks.setFlashMessage.mockResolvedValue('flash=1');
    mocks.resolveErrorPayload.mockReturnValue({ message: 'fallback', status: 400 });
  });

  describe('verify-mobile api action', () => {
    it('returns error when verification token is missing', async () => {
      mocks.readVerificationToken.mockResolvedValueOnce(null);

      const formData = new FormData();
      formData.set('code', '123456');

      const result = await verifyMobileAction({
        request: new Request('http://localhost/api/auth/verify-mobile', { method: 'POST', body: formData }),
      } as never);

      expect(unwrapData(result)).toMatchObject({ error: 'Mangler verifiseringsinformasjon. Prøv igjen.' });
      expect(getStatus(result)).toBe(400);
    });

    it.each([
      {
        name: 'signed in',
        serviceResult: { signedIn: true, nextStep: 'DONE', headers: new Headers([['Set-Cookie', 'auth=1']]) },
        expected: { success: true, signedIn: true, nextStep: 'DONE' },
      },
      {
        name: 'still pending',
        serviceResult: { signedIn: false, nextStep: 'VERIFY_MOBILE' },
        expected: { success: true, signedIn: false, nextStep: 'VERIFY_MOBILE' },
      },
    ])('$name', async ({ serviceResult, expected }) => {
      mocks.verifyMobile.mockResolvedValueOnce(serviceResult);

      const formData = new FormData();
      formData.set('code', '123456');

      const result = await verifyMobileAction({
        request: new Request('http://localhost/api/auth/verify-mobile', { method: 'POST', body: formData }),
      } as never);

      expect(unwrapData(result)).toMatchObject(expected);
    });
  });

  describe('resend verification email/mobile api actions', () => {
    it.each([
      {
        name: 'email resend',
        actionFn: resendEmailAction,
        form: { email: 'user@example.com', redirectUrl: 'booking' },
        expectedSend: { sendEmail: true, sendMobile: false },
      },
      {
        name: 'mobile resend',
        actionFn: resendMobileAction,
        form: { verificationSessionToken: 'vt-1', redirectUrl: 'booking' },
        expectedSend: { sendEmail: false, sendMobile: true },
      },
    ])('$name returns success payload and cookies', async ({ actionFn, form, expectedSend }) => {
      mocks.resendVerification.mockResolvedValueOnce({
        nextToken: 'vt-2',
        nextTokenExpiresAt: '2030-01-01T00:00:00.000Z',
        successMessage: 'sent',
        data: { emailDelivery: { status: 'SENT' } },
      });

      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.set(key, value));

      const result = await actionFn({
        request: new Request('http://localhost/api/auth/resend', { method: 'POST', body: formData }),
      } as never);

      expect(mocks.resendVerification).toHaveBeenCalledWith(
        expect.objectContaining({
          ...expectedSend,
        }),
      );
      expect(unwrapData(result)).toMatchObject({
        success: true,
        message: 'sent',
        verificationSessionToken: 'vt-2',
      });
    });
  });

  describe('user-status api loader', () => {
    it('returns 400 payload on missing userId', async () => {
      const result = await userStatusLoader({
        request: new Request('http://localhost/api/auth/user-status'),
      } as never);

      expect(unwrapData(result)).toMatchObject({ error: 'Mangler bruker-ID. Prøv igjen.' });
      expect(getStatus(result)).toBe(400);
    });

    it('returns user status payload', async () => {
      mocks.getUserStatus.mockResolvedValueOnce({
        user: { id: 1 },
        nextStep: 'VERIFY_EMAIL',
      });

      const result = await userStatusLoader({
        request: new Request('http://localhost/api/auth/user-status?userId=1'),
      } as never);

      expect(unwrapData(result)).toMatchObject({
        user: { id: 1 },
        nextStep: 'VERIFY_EMAIL',
      });
    });
  });
});
