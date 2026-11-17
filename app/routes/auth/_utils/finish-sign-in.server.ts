import { AuthController, type AuthenticationTokenDto } from '~/api/generated';
import { authService } from '~/lib/auth-service';
import { logger } from '~/lib/logger';
import { ROUTES_MAP } from '~/lib/routing/route-tree';

/**
 * Where someone lands once signed in, plus the auth cookies. Someone with one company is signed into it, someone
 * with several picks one, and a customer with none goes to Mine bookinger. A safe returnTo wins when nothing
 * has to be picked first.
 */
export async function finishSignIn(
  tokens: AuthenticationTokenDto,
  returnTo: string | null,
): Promise<{ href: string; headers: Headers }> {
  let authTokens = tokens;
  let href = returnTo ?? ROUTES_MAP['booking.public.my-appointments'].href;

  if (authService.getCompanyIdFromToken(tokens.accessToken)) {
    // Already signed into a company: a business user, who keeps today's landing page.
    if (!returnTo) href = '/';
  } else {
    try {
      const contexts =
        (
          await AuthController.getCompanyContexts({
            headers: { Authorization: `Bearer ${tokens.accessToken}` },
          })
        ).data?.data ?? [];

      if (contexts.length === 1) {
        const companyTokens = (
          await AuthController.companySignIn({
            body: { companyId: contexts[0].id },
            headers: { Authorization: `Bearer ${tokens.accessToken}` },
          })
        ).data?.data;
        if (companyTokens) authTokens = companyTokens;
        // Business users keep today's landing page.
        if (!returnTo) href = '/';
      } else if (contexts.length > 1) {
        href = returnTo
          ? `${ROUTES_MAP['user.company-context'].href}?returnTo=${encodeURIComponent(returnTo)}`
          : ROUTES_MAP['user.company-context'].href;
      }
    } catch (error) {
      logger.warn('[auth.finish-sign-in] Failed to resolve company context', { error });
    }
  }

  const headers = new Headers();
  const cookieHeaders = await authService.setAuthCookies(
    authTokens.accessToken,
    authTokens.refreshToken,
    authTokens.accessTokenExpiresAt,
    authTokens.refreshTokenExpiresAt,
  );
  for (const [key, value] of new Headers(cookieHeaders).entries()) headers.append(key, value);
  return { href, headers };
}
