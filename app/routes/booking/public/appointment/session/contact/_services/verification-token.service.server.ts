import { verificationSessionToken } from '~/lib/auth.server';

type TokenLike = {
  value?: string | null;
  expiresAt?: string | Date | null;
} | null;

/**
 * The backend sends a verification token's expiry as UTC without a zone ("2026-11-17T15:03:30", VerificationTokenDto
 * is a LocalDateTime in UTC). `new Date()` would read that as the server's local time, so on a server in Oslo the
 * cookie expired the moment it was set. Read zone-less times as UTC; times with a zone are kept as they are.
 */
export function parseVerificationExpiry(expiresAt?: string | Date | null): Date | undefined {
  if (!expiresAt) return undefined;
  if (expiresAt instanceof Date) return expiresAt;
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(expiresAt.trim());
  const parsed = new Date(hasZone ? expiresAt : `${expiresAt.trim()}Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export class VerificationTokenService {
  static async readVerificationToken(request: Request): Promise<string | null> {
    const cookieHeader = request.headers.get('Cookie');
    const token = await verificationSessionToken.parse(cookieHeader);
    if (!token || typeof token !== 'string') {
      return null;
    }
    return token;
  }

  static async buildVerificationCookieHeader(token: string, expiresAt?: string | Date | null): Promise<string> {
    return verificationSessionToken.serialize(token, { expires: parseVerificationExpiry(expiresAt) });
  }

  static async buildVerificationCookieHeaderFromDto(tokenDto: TokenLike): Promise<string | null> {
    const value = tokenDto?.value;
    if (!value) {
      return null;
    }
    return this.buildVerificationCookieHeader(value, tokenDto?.expiresAt);
  }
}
