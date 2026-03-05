import { describe, expect, it } from 'vitest';
import { ROUTES_MAP } from '~/lib/route-tree';
import {
  resolveAuthNextStepHref,
  resolveAuthStatusNextStepHref,
  shouldStoreVerificationToken,
} from './auth.utils';

describe('booking contact auth step matrix', () => {
  it.each([
    { nextStep: 'COLLECT_EMAIL', expected: ROUTES_MAP['booking.public.appointment.session.contact.collect-email'].href },
    {
      nextStep: 'COLLECT_MOBILE',
      expected: ROUTES_MAP['booking.public.appointment.session.contact.collect-mobile'].href,
    },
    { nextStep: 'VERIFY_EMAIL', expected: ROUTES_MAP['booking.public.appointment.session.contact.verify-email'].href },
    { nextStep: 'VERIFY_MOBILE', expected: ROUTES_MAP['booking.public.appointment.session.contact.verify-mobile'].href },
    { nextStep: 'DONE', expected: ROUTES_MAP['booking.public.appointment.session.employee'].href },
    { nextStep: null, expected: null },
    { nextStep: undefined, expected: null },
  ])('maps $nextStep', ({ nextStep, expected }) => {
    expect(resolveAuthNextStepHref(nextStep as never)).toBe(expected);
  });

  it('maps status helper through auth status shape', () => {
    expect(
      resolveAuthStatusNextStepHref({
        nextStep: 'VERIFY_MOBILE',
      } as never),
    ).toBe(ROUTES_MAP['booking.public.appointment.session.contact.verify-mobile'].href);
  });

  it.each([
    { nextStep: 'VERIFY_EMAIL', expected: true },
    { nextStep: 'VERIFY_MOBILE', expected: true },
    { nextStep: 'COLLECT_EMAIL', expected: true },
    { nextStep: 'COLLECT_MOBILE', expected: true },
    { nextStep: 'DONE', expected: false },
    { nextStep: null, expected: true },
  ])('shouldStoreVerificationToken for $nextStep', ({ nextStep, expected }) => {
    expect(shouldStoreVerificationToken(nextStep as never)).toBe(expected);
  });
});
