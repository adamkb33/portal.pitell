import { describe, expect, it } from 'vitest';
import { ROUTES_MAP } from '~/lib/route-tree';
import { resolveAuthNextStepHref, resolveAuthStatusNextStepHref } from './auth-flow';

describe('auth-flow next-step routing matrix', () => {
  it.each([
    {
      nextStep: 'COLLECT_EMAIL',
      options: { userId: 42 },
      expected: `${ROUTES_MAP['auth.collect-email'].href}?userId=42`,
    },
    {
      nextStep: 'COLLECT_MOBILE',
      options: { userId: 7 },
      expected: `${ROUTES_MAP['auth.collect-mobile'].href}?userId=7`,
    },
    {
      nextStep: 'VERIFY_EMAIL',
      options: {
        emailDelivery: { status: 'SENT' as const },
        mobileDelivery: { status: 'FAILED' as const },
      },
      expected: `${ROUTES_MAP['auth.check-email'].href}?emailDelivery=SENT&mobileDelivery=FAILED`,
    },
    {
      nextStep: 'VERIFY_EMAIL',
      options: {},
      expected: ROUTES_MAP['auth.check-email'].href,
    },
    {
      nextStep: 'VERIFY_MOBILE',
      options: {},
      expected: ROUTES_MAP['auth.verify-mobile'].href,
    },
    {
      nextStep: 'DONE',
      options: {},
      expected: '/',
    },
    {
      nextStep: null,
      options: {},
      expected: null,
    },
    {
      nextStep: undefined,
      options: {},
      expected: null,
    },
  ])('maps $nextStep to expected href', ({ nextStep, options, expected }) => {
    expect(resolveAuthNextStepHref(nextStep as never, options)).toBe(expected);
  });

  it('maps auth status through resolveAuthStatusNextStepHref', () => {
    const href = resolveAuthStatusNextStepHref({
      user: { id: 123 },
      nextStep: 'COLLECT_MOBILE',
    } as never);

    expect(href).toBe(`${ROUTES_MAP['auth.collect-mobile'].href}?userId=123`);
  });
});
