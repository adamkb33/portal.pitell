import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  buildVerificationCookieHeaderFromDto: vi.fn(),
}));

vi.mock('~/routes/booking/public/appointment/session/contact/_services/verification-token.service.server', () => ({
  VerificationTokenService: {
    buildVerificationCookieHeaderFromDto: mocks.buildVerificationCookieHeaderFromDto,
  },
}));

import { resolveAuthPostRedirect } from './auth-flow.server';

describe('resolveAuthPostRedirect matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.buildVerificationCookieHeaderFromDto.mockResolvedValue(null);
  });

  it('returns nulls for empty payload', async () => {
    await expect(resolveAuthPostRedirect(null)).resolves.toEqual({
      nextStepHref: null,
      verificationCookieHeader: null,
    });
  });

  it.each([
    {
      name: 'sign-in verify email with delivery and token',
      payload: {
        userId: 3,
        nextStep: 'VERIFY_EMAIL',
        emailDelivery: { status: 'SENT' as const },
        mobileDelivery: { status: 'NOT_ATTEMPTED' as const },
        verificationToken: { value: 'vt-1', expiresAt: '2030-01-01T00:00:00.000Z' },
      },
      cookie: 'verification=vt-1',
      expectedHref: '/auth/check-email?emailDelivery=SENT&mobileDelivery=NOT_ATTEMPTED',
    },
    {
      name: 'provider collect mobile',
      payload: {
        userId: 10,
        nextStep: 'COLLECT_MOBILE',
      },
      cookie: null,
      expectedHref: '/auth/collect-mobile?userId=10',
    },
    {
      name: 'done',
      payload: {
        userId: 20,
        nextStep: 'DONE',
      },
      cookie: null,
      expectedHref: '/',
    },
  ])('$name', async ({ payload, cookie, expectedHref }) => {
    mocks.buildVerificationCookieHeaderFromDto.mockResolvedValueOnce(cookie);

    const result = await resolveAuthPostRedirect(payload as never);

    expect(result.nextStepHref).toBe(expectedHref);
    expect(result.verificationCookieHeader).toBe(cookie);
  });
});
