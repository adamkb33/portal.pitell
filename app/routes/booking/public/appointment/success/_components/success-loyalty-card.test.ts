import { describe, expect, it } from 'vitest';
import type { LoyaltyCardDto } from '~/api/generated';
import { describeLoyaltyProgress } from '~/routes/booking/public/my-appointments/_utils/my-appointments.utils';
import { getSuccessLoyaltyStamps } from './success-loyalty-card';

const card = (visitsRequired: number, visitsInCycle: number): LoyaltyCardDto => ({
  companyId: 1,
  visitsRequired,
  visitsInCycle,
  nextVisitIsFree: visitsInCycle === visitsRequired - 1,
  upcomingFreeAppointmentIds: [],
});

describe('getSuccessLoyaltyStamps', () => {
  it('uses the same sentence as the stamp card page', () => {
    for (const visits of [0, 1, 2, 3, 4]) {
      expect(getSuccessLoyaltyStamps(card(5, visits))?.title).toBe(describeLoyaltyProgress(card(5, visits)));
    }
  });

  it('marks the visit just booked on the first open slot', () => {
    expect(getSuccessLoyaltyStamps(card(5, 0))).toMatchObject({
      doneCount: 0,
      currentIndex: 0,
      title: '4 besøk til gratis time',
    });
    expect(getSuccessLoyaltyStamps(card(5, 3))).toMatchObject({ doneCount: 3, currentIndex: 3 });
  });

  it('has no open slot when the free visit is already waiting', () => {
    expect(getSuccessLoyaltyStamps(card(5, 4))).toMatchObject({
      doneCount: 4,
      currentIndex: null,
      title: 'Neste besøk er gratis',
    });
  });

  it('shows nothing when every visit is free', () => {
    expect(getSuccessLoyaltyStamps(card(1, 0))).toBeNull();
  });
});
