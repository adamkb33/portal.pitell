import type { ErrorPayloadResult } from '~/lib/api-error';

/** "42 sekunder" or "12 minutter": how long until something can be tried again. */
export function formatWait(seconds: number): string {
  if (seconds < 60) return seconds === 1 ? '1 sekund' : `${seconds} sekunder`;
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? '1 minutt' : `${minutes} minutter`;
}

/** "42 s" or "12 min", short enough for a button. */
export function formatShortWait(seconds: number): string {
  return seconds < 60 ? `${seconds} s` : `${Math.ceil(seconds / 60)} min`;
}

export function readRetryAfterSeconds(error: ErrorPayloadResult): number | undefined {
  const value = error.details?.retryAfterSeconds;
  return typeof value === 'number' && value > 0 ? Math.ceil(value) : undefined;
}

/** One short sentence saying what went wrong with the SMS code and what to do now. */
export function describeSmsCodeError(error: ErrorPayloadResult): string {
  const retryAfterSeconds = readRetryAfterSeconds(error);
  const remainingAttempts = error.details?.remainingAttempts;

  switch (error.code) {
    case 'INVALID_CODE':
      if (typeof remainingAttempts !== 'number') return 'Feil kode. Prøv igjen.';
      return remainingAttempts > 0
        ? `Feil kode. ${remainingAttempts} forsøk igjen.`
        : 'For mange feil forsøk. Be om en ny kode.';
    case 'CHALLENGE_EXHAUSTED':
      return 'For mange feil forsøk. Be om en ny kode.';
    case 'CHALLENGE_EXPIRED':
      return 'Koden er utløpt. Be om en ny kode.';
    case 'CHALLENGE_RESEND_TOO_SOON':
      return retryAfterSeconds
        ? `Du kan be om en ny kode om ${formatWait(retryAfterSeconds)}.`
        : 'Vent litt før du ber om en ny kode.';
    case 'CHALLENGE_RATE_LIMITED':
      return retryAfterSeconds
        ? `Du har bedt om for mange koder. Prøv igjen om ${formatWait(retryAfterSeconds)}.`
        : 'Du har bedt om for mange koder. Prøv igjen senere.';
    default:
      return error.message;
  }
}
