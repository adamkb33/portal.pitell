type ErrorLike = {
  response?: {
    data?: {
      message?: {
        id?: string;
        value?: string;
      };
    };
  };
  data?: {
    message?: {
      id?: string;
      value?: string;
    };
  };
};

export function extractAuthErrorCode(error: unknown): string | null {
  const payload = error as ErrorLike;
  return payload?.response?.data?.message?.id ?? payload?.data?.message?.id ?? null;
}

export function mapAuthErrorCodeToMessage(code: string | null, fallback: string): string {
  if (!code) return fallback;

  switch (code) {
    case 'MOBILE_ALREADY_IN_USE':
      return 'Dette mobilnummeret er allerede i bruk.';
    case 'EMAIL_ALREADY_IN_USE':
      return 'Denne e-posten er allerede i bruk.';
    case 'AUTH_PROVIDER_MISMATCH_GOOGLE':
      return 'Denne brukeren må logge inn med Google.';
    case 'AUTH_PROVIDER_MISMATCH_FACEBOOK':
      return 'Denne brukeren må logge inn med Facebook.';
    case 'AUTH_PROVIDER_MISMATCH_LOCAL':
      return 'Denne brukeren må logge inn med e-post og passord.';
    case 'OTP_INVALID':
      return 'Koden er ugyldig. Prøv igjen.';
    case 'OTP_EXPIRED':
      return 'Koden har utløpt. Be om ny kode.';
    case 'INVALID_TOKEN':
      return 'Verifiseringslenken er ugyldig. Be om ny e-post.';
    case 'TOKEN_EXPIRED':
      return 'Verifiseringslenken har utløpt. Be om ny e-post.';
    default:
      return fallback;
  }
}
