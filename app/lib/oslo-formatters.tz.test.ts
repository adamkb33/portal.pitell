import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { formatNorwegianDateTime } from '~/routes/booking/public/appointment/session/overview/_utils/format-norwegian-date-time';
import { formatDateParts } from '~/routes/booking/public/my-appointments/_utils/my-appointments.utils';
import { formatDateTime } from '~/routes/company/booking/appointments/_utils/appointments.utils';
import { formatOfferDateTime } from '~/routes/company/offer/_utils/offer-money';

// Each page's formatter, with the viewer in New York. 00:30 in Oslo on the 16th is 18:30 on the 15th there,
// so a formatter that slips back to the browser zone shows the wrong day and time.
const originalTz = process.env.TZ;
beforeAll(() => {
  process.env.TZ = 'America/New_York';
});
afterAll(() => {
  process.env.TZ = originalTz;
});

const JUST_AFTER_MIDNIGHT = '2027-01-16T00:30:00+01:00';
const SAME_INSTANT_IN_UTC = '2027-01-15T23:30:00Z';

describe('page formatters show Oslo time for a viewer in New York', () => {
  it('booking summary and success page', () => {
    for (const value of [JUST_AFTER_MIDNIGHT, SAME_INSTANT_IN_UTC]) {
      expect(formatNorwegianDateTime(value)).toMatchObject({
        dayName: 'Lørdag',
        date: '16. januar 2027',
        time: 'kl. 00:30',
        short: 'Lør 16. jan, 00:30',
      });
    }
  });

  it('Mine bookinger cards', () => {
    expect(formatDateParts(JUST_AFTER_MIDNIGHT)).toEqual({
      longDate: 'Lørdag 16. januar',
      day: '16',
      month: 'jan',
      shortDate: '16. jan.',
      time: '00:30',
    });
  });

  it('company appointments', () => {
    const text = formatDateTime(SAME_INSTANT_IN_UTC);
    expect(text).toContain('16.01.2027');
    expect(text).toContain('00:30');
  });

  it('offers', () => {
    const text = formatOfferDateTime(JUST_AFTER_MIDNIGHT);
    expect(text).toContain('16. jan');
    expect(text).toContain('00:30');
  });

  it('summer time: same wall clock, other offset', () => {
    expect(formatNorwegianDateTime('2027-07-16T00:30:00+02:00').time).toBe('kl. 00:30');
    expect(formatDateParts('2027-07-15T22:30:00Z').time).toBe('00:30');
  });
});
