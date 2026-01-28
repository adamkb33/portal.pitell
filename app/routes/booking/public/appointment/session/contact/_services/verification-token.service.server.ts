import { verificationSessionToken } from '~/lib/auth.server';

type TokenLike = {
  value?: string | null;
  expiresAt?: string | Date | null;
} | null;

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
    const expires = expiresAt ? new Date(expiresAt) : undefined;
    return verificationSessionToken.serialize(token, { expires });
  }

  static async buildVerificationCookieHeaderFromDto(tokenDto: TokenLike): Promise<string | null> {
    const value = tokenDto?.value;
    if (!value) {
      return null;
    }
    return this.buildVerificationCookieHeader(value, tokenDto?.expiresAt);
  }
}
