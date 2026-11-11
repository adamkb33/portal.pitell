import { describe, expect, it } from 'vitest';
import { absenceSummary, defaultAbsenceDraft, withStartDay, type AbsenceDraft } from './absence-draft';

// Wednesday 11 November 2026, 10:00 local.
const now = new Date(2026, 10, 11, 10, 0);
const draft = (extra: Partial<AbsenceDraft> = {}): AbsenceDraft => ({
  wholeDay: true,
  startDay: '2026-11-12',
  startTime: '12:00',
  endDay: '2026-11-12',
  endTime: '13:00',
  ...extra,
});

describe('Nytt fravær', () => {
  it('saves one whole day as 00:00–23:59', () => {
    expect(absenceSummary(draft(), now)).toEqual({
      valid: true,
      text: 'Torsdag 12. nov. · hele dagen',
      range: { fromDate: '2026-11-12', toDate: '2026-11-12', startTime: '00:00', endTime: '23:59' },
    });
  });

  it('starts a whole day today from the next minute', () => {
    const summary = absenceSummary(draft({ startDay: '2026-11-11', endDay: '2026-11-11' }), now);
    expect(summary.range).toMatchObject({ startTime: '10:01', endTime: '23:59' });
  });

  it('names part of one day with its length', () => {
    expect(absenceSummary(draft({ wholeDay: false }), now).text).toBe('Torsdag 12. nov. · 12:00–13:00 · 1 t');
  });

  it('reads as one period from the start day and time to the end day and time', () => {
    const summary = absenceSummary(draft({ wholeDay: false, endDay: '2026-11-15', endTime: '18:00' }), now);
    expect(summary.text).toBe('Torsdag 12. nov. 12:00 → søndag 15. nov. 18:00');
    expect(summary.range).toEqual({
      fromDate: '2026-11-12',
      toDate: '2026-11-15',
      startTime: '12:00',
      endTime: '18:00',
    });
  });

  it('names several whole days as a range', () => {
    expect(absenceSummary(draft({ endDay: '2026-11-15' }), now).text).toBe('12.–15. nov. · hele dagen');
  });

  it('says why it cannot be saved', () => {
    expect(
      absenceSummary(draft({ wholeDay: false, startDay: '2026-11-11', endDay: '2026-11-11', startTime: '09:00' }), now),
    ).toEqual({
      valid: false,
      text: 'Starter må være senere enn nå',
    });
    expect(absenceSummary(draft({ wholeDay: false, endTime: '11:00' }), now).text).toBe(
      'Slutter må være etter starter',
    );
  });

  it('moves Slutter along with a later Starter, so one day stays one click', () => {
    expect(withStartDay(draft(), '2026-11-14')).toMatchObject({ startDay: '2026-11-14', endDay: '2026-11-14' });
    expect(withStartDay(draft({ endDay: '2026-11-20' }), '2026-11-14')).toMatchObject({ endDay: '2026-11-20' });
  });

  it('starts at the next whole hour, one hour long, and not as a whole day', () => {
    expect(defaultAbsenceDraft(new Date(2026, 10, 11, 14, 25))).toEqual({
      wholeDay: false,
      startDay: '2026-11-11',
      startTime: '15:00',
      endDay: '2026-11-11',
      endTime: '16:00',
    });
    expect(defaultAbsenceDraft(new Date(2026, 10, 11, 22, 40))).toMatchObject({
      startDay: '2026-11-12',
      startTime: '09:00',
      endTime: '10:00',
    });
  });
});
