import { describe, expect, it } from 'vitest';
import { describeSmsCodeError, formatShortWait, formatWait } from './sms-code-message';

describe('SMS code messages', () => {
  it('says how many attempts are left after a wrong code', () => {
    expect(describeSmsCodeError({ message: '', code: 'INVALID_CODE', details: { remainingAttempts: 3 } })).toBe(
      'Feil kode. 3 forsøk igjen.',
    );
    expect(describeSmsCodeError({ message: '', code: 'INVALID_CODE', details: { remainingAttempts: 0 } })).toBe(
      'For mange feil forsøk. Be om en ny kode.',
    );
    expect(describeSmsCodeError({ message: '', code: 'INVALID_CODE' })).toBe('Feil kode. Prøv igjen.');
  });

  it('says how long to wait before asking for a new code', () => {
    expect(
      describeSmsCodeError({ message: '', code: 'CHALLENGE_RESEND_TOO_SOON', details: { retryAfterSeconds: 42 } }),
    ).toBe('Du kan be om en ny kode om 42 sekunder.');
    expect(
      describeSmsCodeError({ message: '', code: 'CHALLENGE_RATE_LIMITED', details: { retryAfterSeconds: 690 } }),
    ).toBe('Du har bedt om for mange koder. Prøv igjen om 12 minutter.');
  });

  it("falls back to the backend's own text for other errors", () => {
    expect(describeSmsCodeError({ message: 'Noe gikk galt.' })).toBe('Noe gikk galt.');
  });

  it('formats waits in seconds under a minute and whole minutes above', () => {
    expect(formatWait(1)).toBe('1 sekund');
    expect(formatWait(61)).toBe('2 minutter');
    expect(formatWait(60)).toBe('1 minutt');
    expect(formatShortWait(42)).toBe('42 s');
    expect(formatShortWait(690)).toBe('12 min');
  });
});
