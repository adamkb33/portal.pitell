import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { absenceSummary, defaultAbsenceDraft } from './absence-draft';

// The company user is abroad: the default and the checks still follow the shop's clock (Oslo).
const originalTz = process.env.TZ;
beforeAll(() => {
  process.env.TZ = 'America/New_York';
});
afterAll(() => {
  process.env.TZ = originalTz;
});

describe('Nytt fravær for a user in New York', () => {
  it('starts at the next whole Oslo hour', () => {
    // 14:25 in Oslo is 08:25 in New York.
    expect(defaultAbsenceDraft(new Date('2026-11-11T14:25:00+01:00'))).toEqual({
      wholeDay: false,
      startDay: '2026-11-11',
      startTime: '15:00',
      endDay: '2026-11-11',
      endTime: '16:00',
    });
  });

  it('moves to tomorrow 09:00 after 22:00 in Oslo, even when it is still afternoon in New York', () => {
    expect(defaultAbsenceDraft(new Date('2026-11-11T22:40:00+01:00'))).toMatchObject({
      startDay: '2026-11-12',
      startTime: '09:00',
      endTime: '10:00',
    });
  });

  it('judges "in the past" by the Oslo clock', () => {
    const now = new Date('2026-11-11T14:25:00+01:00');
    const period = { wholeDay: false, startDay: '2026-11-11', endDay: '2026-11-11', endTime: '16:00' };
    expect(absenceSummary({ ...period, startTime: '14:00' }, now).valid).toBe(false);
    expect(absenceSummary({ ...period, startTime: '15:00' }, now).valid).toBe(true);
  });
});
