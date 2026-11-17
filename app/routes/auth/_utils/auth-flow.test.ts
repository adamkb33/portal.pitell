import { describe, expect, it } from 'vitest';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { resolveAuthNextStepHref } from './auth-flow';

describe('auth-flow next-step routing matrix', () => {
  it.each([
    {
      nextStep: 'COLLECT_EMAIL',
      expected: ROUTES_MAP['auth.collect-email'].href,
    },
    {
      nextStep: 'COLLECT_MOBILE',
      expected: ROUTES_MAP['auth.collect-mobile'].href,
    },
    {
      nextStep: 'VERIFY_MOBILE',
      expected: ROUTES_MAP['auth.verify-mobile'].href,
    },
    {
      nextStep: 'DONE',
      expected: '/',
    },
    {
      nextStep: null,
      expected: null,
    },
    {
      nextStep: undefined,
      expected: null,
    },
  ])('maps $nextStep to expected href', ({ nextStep, expected }) => {
    expect(resolveAuthNextStepHref(nextStep as never)).toBe(expected);
  });
});
