import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  providerCompleteProfile: vi.fn(),
  verifyMobile: vi.fn(),
  resendVerificationEmailOnly: vi.fn(),
  resendVerificationMobileOnly: vi.fn(),
  userStatus: vi.fn(),
  setAuthCookies: vi.fn(),
  getAppointmentSessionProfiles: vi.fn(),
  setPendingAppointmentSessionUser: vi.fn(),
  attachUser: vi.fn(),
  resolveAuthNextStepHref: vi.fn(),
  buildVerificationCookieHeaderFromDto: vi.fn(),
}));

vi.mock('~/api/generated/base', () => ({
  AuthController: {
    signIn: mocks.signIn,
    signUp: mocks.signUp,
    providerCompleteProfile: mocks.providerCompleteProfile,
    verifyMobile: mocks.verifyMobile,
    resendVerificationEmailOnly: mocks.resendVerificationEmailOnly,
    resendVerificationMobileOnly: mocks.resendVerificationMobileOnly,
    userStatus: mocks.userStatus,
  },
}));

vi.mock('~/api/generated/booking', () => ({
  PublicAppointmentSessionController: {
    getAppointmentSessionProfiles: mocks.getAppointmentSessionProfiles,
    setPendingAppointmentSessionUser: mocks.setPendingAppointmentSessionUser,
  },
}));

vi.mock('../../_services/appointment-session.service.server', () => ({
  AppointmentSessionService: {
    attachUser: mocks.attachUser,
  },
}));

vi.mock('~/lib/auth-service', () => ({
  authService: {
    setAuthCookies: mocks.setAuthCookies,
  },
}));

vi.mock('../_utils/auth.utils', () => ({
  resolveAuthNextStepHref: mocks.resolveAuthNextStepHref,
}));

vi.mock('./verification-token.service.server', () => ({
  VerificationTokenService: {
    buildVerificationCookieHeaderFromDto: mocks.buildVerificationCookieHeaderFromDto,
  },
}));

import { ContactAuthService } from './contact-auth.service.server';

describe('ContactAuthService matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveAuthNextStepHref.mockImplementation((nextStep: string) => (nextStep ? `/booking/next/${nextStep}` : null));
    mocks.buildVerificationCookieHeaderFromDto.mockResolvedValue(null);
    mocks.setAuthCookies.mockResolvedValue(new Headers([['Set-Cookie', 'auth=1']]));
  });

  it('signInWithProvider delegates to AuthController.signIn', async () => {
    mocks.signIn.mockResolvedValueOnce({ data: { data: { userId: 1, nextStep: 'DONE' } } });

    const result = await ContactAuthService.signInWithProvider({
      provider: 'GOOGLE',
      idToken: 'id-token',
      redirectUrl: 'booking',
    });

    expect(mocks.signIn).toHaveBeenCalledWith({
      query: { redirectUrl: 'booking' },
      body: { provider: 'GOOGLE', idToken: 'id-token' },
    });
    expect(result).toEqual({ userId: 1, nextStep: 'DONE' });
  });

  it('completeProfile sends both email and mobile when provided', async () => {
    mocks.providerCompleteProfile.mockResolvedValueOnce({
      data: { data: { userId: 1, nextStep: 'VERIFY_EMAIL' } },
    });

    await ContactAuthService.completeProfile({
      userId: 1,
      email: 'user@example.com',
      mobileNumber: '+4712345678',
    });

    expect(mocks.providerCompleteProfile).toHaveBeenCalledWith({
      body: {
        userId: 1,
        email: 'user@example.com',
        mobileNumber: '+4712345678',
      },
    });
  });

  it.each([
    {
      name: 'verifyMobile without authTokens keeps user unsigned and returns nextStep',
      payload: { nextStep: 'VERIFY_MOBILE' },
      signedIn: false,
      expectedStep: 'VERIFY_MOBILE',
      expectSetCookies: false,
    },
    {
      name: 'verifyMobile with authTokens signs user in',
      payload: {
        nextStep: 'DONE',
        authTokens: {
          accessToken: 'a',
          refreshToken: 'r',
          accessTokenExpiresAt: 1000,
          refreshTokenExpiresAt: 2000,
        },
      },
      signedIn: true,
      expectedStep: 'DONE',
      expectSetCookies: true,
    },
  ])('$name', async ({ payload, signedIn, expectedStep, expectSetCookies }) => {
    mocks.verifyMobile.mockResolvedValueOnce({ data: { data: payload } });

    const result = await ContactAuthService.verifyMobile({
      verificationSessionToken: 'vt-1',
      code: '123456',
    });

    expect(result.signedIn).toBe(signedIn);
    expect(result.nextStep).toBe(expectedStep);
    if (expectSetCookies) {
      expect(mocks.setAuthCookies).toHaveBeenCalledOnce();
      expect(result.headers).toBeDefined();
    } else {
      expect(mocks.setAuthCookies).not.toHaveBeenCalled();
    }
  });

  it.each([
    {
      name: 'email-only resend',
      input: { verificationSessionToken: 'vt-1', sendEmail: true, sendMobile: false },
      responseMock: 'resendVerificationEmailOnly',
      expectedToken: 'vt-2',
      expectedMessage: 'sent-email',
    },
    {
      name: 'mobile-only resend',
      input: { verificationSessionToken: 'vt-1', sendEmail: false, sendMobile: true },
      responseMock: 'resendVerificationMobileOnly',
      expectedToken: 'vt-3',
      expectedMessage: 'sent-sms',
    },
  ])('$name', async ({ input, responseMock, expectedToken, expectedMessage }) => {
    const responsePayload =
      responseMock === 'resendVerificationEmailOnly'
        ? {
            data: {
              message: { value: expectedMessage },
              data: {
                verificationToken: { value: expectedToken, expiresAt: '2030-01-01T00:00:00.000Z' },
              },
            },
          }
        : {
            data: {
              message: { value: expectedMessage },
              data: {
                verificationToken: { value: expectedToken, expiresAt: '2030-01-01T00:00:00.000Z' },
              },
            },
          };

    if (responseMock === 'resendVerificationEmailOnly') {
      mocks.resendVerificationEmailOnly.mockResolvedValueOnce(responsePayload);
    } else {
      mocks.resendVerificationMobileOnly.mockResolvedValueOnce(responsePayload);
    }

    const result = await ContactAuthService.resendVerification({
      ...input,
      redirectUrl: 'booking',
    });

    expect(result.nextToken).toBe(expectedToken);
    expect(result.successMessage).toBe(expectedMessage);
  });

  it.each([
    {
      name: 'resolvePostAuthRedirect with verification token',
      payload: {
        userId: 1,
        nextStep: 'VERIFY_EMAIL',
        verificationToken: { value: 'vt-1', expiresAt: '2030-01-01T00:00:00.000Z' },
      },
      cookie: 'verification=vt-1',
      expectedHref: '/booking/next/VERIFY_EMAIL',
    },
    {
      name: 'resolvePostAuthRedirect without token',
      payload: {
        userId: 2,
        nextStep: 'DONE',
      },
      cookie: null,
      expectedHref: '/booking/next/DONE',
    },
  ])('$name', async ({ payload, cookie, expectedHref }) => {
    mocks.buildVerificationCookieHeaderFromDto.mockResolvedValueOnce(cookie);

    const result = await ContactAuthService.resolvePostAuthRedirect(payload as never);

    expect(result.nextStepHref).toBe(expectedHref);
    expect(result.verificationCookieHeader).toBe(cookie);
  });
});
