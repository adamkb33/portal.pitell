import { describe, expect, it } from 'vitest';
import { estimateSms } from './sms';

describe('Sveve SMS unit estimate', () => {
  it('counts standard text including Norwegian letters', () => {
    expect(estimateSms('ÆØÅæøå')).toEqual({ units: 1, unicode: false });
    expect(estimateSms('a'.repeat(160)).units).toBe(1);
    expect(estimateSms('a'.repeat(161)).units).toBe(2);
    expect(estimateSms('a'.repeat(307)).units).toBe(3);
  });

  it('counts extended GSM characters twice without splitting them', () => {
    expect(estimateSms('€'.repeat(80))).toEqual({ units: 1, unicode: false });
    expect(estimateSms('€'.repeat(153)).units).toBe(3);
  });

  it('uses Unicode limits for special characters and counts emoji pairs', () => {
    expect(estimateSms('漢'.repeat(70))).toEqual({ units: 1, unicode: true });
    expect(estimateSms('漢'.repeat(71)).units).toBe(2);
    expect(estimateSms('😀'.repeat(35)).units).toBe(1);
    expect(estimateSms('😀'.repeat(67)).units).toBe(3);
  });

  it('counts the unsubscribe footer as part of the message', () => {
    const body = 'a'.repeat(150);
    expect(estimateSms(body).units).toBe(1);
    expect(estimateSms(`${body}\nAvmeld: https://pitell.no/u/${'A'.repeat(22)}`).units).toBe(2);
  });

  it('has no units for an empty message', () => {
    expect(estimateSms('').units).toBe(0);
  });
});
