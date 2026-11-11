import { client } from '~/api/generated/client.gen';
import { accessTokenCookie } from '~/routes/auth/_features/auth.cookies.server';
import { logger } from '~/lib/logger';
import { toJwtClaims } from '~/routes/auth/_utils/token-payload';

let authClientQueue: Promise<void> = Promise.resolve();

function setAuthorizationHeader(accessToken?: string) {
  // `mergeHeaders` (generated client) only clears a header when its value is
  // explicitly `null` — an absent key is left untouched. Passing `{}` here would
  // silently keep whatever Authorization a previous, unrelated request last set on
  // this process-wide singleton, leaking that user's token into this one.
  const headers = {
    Authorization: accessToken ? `Bearer ${accessToken}` : null,
  };

  client.setConfig({ headers });
}

export async function withAuth<T>(request: Request, callback: () => Promise<T> | T, token?: string): Promise<T> {
  const run = async (): Promise<T> => {
    const cookieHeader = request.headers.get('Cookie');
    const accessToken = token || (await accessTokenCookie.parse(cookieHeader));

    logger.info('[with-auth] Preparing authenticated request context', {
      requestMethod: request.method,
      requestUrl: request.url,
      hasCookieHeader: Boolean(cookieHeader),
      hasAccessToken: Boolean(accessToken),
      tokenSource: token ? 'argument' : 'cookie',
    });

    // NOTE: Generated SDK clients are process singletons.
    // We serialize authenticated calls to avoid cross-request header races.
    setAuthorizationHeader(accessToken || undefined);

    try {
      const result = await callback();
      logger.info('[with-auth] Authenticated request completed', {
        requestMethod: request.method,
        requestUrl: request.url,
      });
      return result;
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) {
        let tokenClaims: Record<string, unknown> | null = null;
        try {
          if (accessToken) {
            const claims = toJwtClaims(accessToken) as Record<string, unknown>;
            tokenClaims = {
              sub: claims.sub,
              companyId: claims.companyId,
              email: claims.email,
              userRoles: claims.userRoles,
              roles: claims.roles,
              authorities: claims.authorities,
              scope: claims.scope,
              exp: claims.exp,
              iat: claims.iat,
            };
          }
        } catch {
          tokenClaims = null;
        }

        logger.info('[with-auth] Authenticated request denied', {
          requestMethod: request.method,
          requestUrl: request.url,
          status,
          tokenClaims,
        });
      } else {
        logger.error('[with-auth] Authenticated request failed', {
          requestMethod: request.method,
          requestUrl: request.url,
          error,
        });
      }
      throw error;
    } finally {
      setAuthorizationHeader(undefined);
    }
  };

  const next = authClientQueue.then(run, run);
  authClientQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}
