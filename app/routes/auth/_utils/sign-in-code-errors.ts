import type { ErrorPayloadResult } from '~/lib/api-error';
import {
  formatWait,
  readRetryAfterSeconds,
} from '~/routes/booking/public/appointment/session/contact/verify-mobile/_utils/sms-code-message';

/** One short sentence saying what went wrong with a sign-in code and what to do now. */
export function describeSignInCodeError(error: ErrorPayloadResult): string {
  const retryAfterSeconds = readRetryAfterSeconds(error);
  const remainingAttempts = error.details?.remainingAttempts;

  switch (error.code) {
    case 'SIGN_IN_CODE_INVALID':
      if (typeof remainingAttempts !== 'number') return 'Feil kode. Prøv igjen.';
      return remainingAttempts > 0
        ? `Feil kode. ${remainingAttempts} forsøk igjen.`
        : 'For mange feil forsøk. Be om en ny kode.';
    case 'CHALLENGE_EXHAUSTED':
      return 'For mange feil forsøk. Be om en ny kode.';
    case 'SIGN_IN_CODE_EXPIRED':
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
