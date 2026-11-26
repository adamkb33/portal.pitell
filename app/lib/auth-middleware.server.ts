import { AsyncLocalStorage } from 'node:async_hooks';
import type { MiddlewareFunction } from 'react-router';
import { AuthController } from '~/api/generated';
import { REQUEST_AUTH_STORE, type RequestAuthState } from '~/api/utils/request-auth';
import { authService } from '~/lib/auth-service';
import { logger } from '~/lib/logger';
import { accessTokenCookie, refreshTokenCookie } from '~/routes/auth/_features/auth.cookies.server';

const requestAuth = new AsyncLocalStorage<RequestAuthState>();
(globalThis as Record<symbol, unknown>)[REQUEST_AUTH_STORE] = requestAuth;

const AUTH_COOKIE_NAMES = [accessTokenCookie.name, refreshTokenCookie.name];

/**
 * New tokens for an expired sign-in, or null to continue signed out. The backend replaces the refresh token on each
 * use and lets a second request that refreshes at the same moment through (a short grace window), so requests from
 * the same browser running at once need no coordination here.
 */
async function refreshSignIn(expiredAccessToken: string | undefined, refreshToken: string) {
  try {
    const companyId = authService.getCompanyIdFromToken(expiredAccessToken ?? '');
    const response = await AuthController.refresh({ query: { companyId }, body: { refreshToken } });
    const tokens = response.data?.data;
    if (!tokens) throw new Error('The refresh response had no tokens');

    const { headers } = await authService.processTokenRefresh(tokens);
    return { accessToken: tokens.accessToken, cookies: headers.getSetCookie() };
  } catch (error) {
    logger.warn('[auth] refresh failed, continuing signed out', { error });
    return null;
  }
}

/** True when the response sets or clears the sign-in cookies itself (sign-in, sign-out, a company switch). */
function setsAuthCookies(response: Response) {
  return response.headers
    .getSetCookie()
    .some((cookie) => AUTH_COOKIE_NAMES.some((name) => cookie.startsWith(`${name}=`)));
}

function withCookies(response: Response, cookies: string[]) {
  try {
    for (const cookie of cookies) response.headers.append('Set-Cookie', cookie);
    return response;
  } catch {
    // A response with immutable headers (Response.redirect): copy it into one that can take the cookies.
    const copy = new Response(response.body, response);
    for (const cookie of cookies) copy.headers.append('Set-Cookie', cookie);
    return copy;
  }
}

/**
 * Signs every backend call of the request with the signed-in user's token. Reads the sign-in cookies once and, when
 * the access token has expired (or is about to), refreshes it before any loader or action runs, so they all use the
 * same valid token. The new cookies go out with the response, unless the response signs in or out itself.
 */
export const authMiddleware: MiddlewareFunction<Response> = async ({ request }, next) => {
  const cookieHeader = request.headers.get('Cookie');
  const cookieAccessToken: string | undefined = (await accessTokenCookie.parse(cookieHeader)) || undefined;
  const refreshToken: string | undefined = (await refreshTokenCookie.parse(cookieHeader)) || undefined;

  let accessToken = cookieAccessToken && !authService.isTokenExpired(cookieAccessToken) ? cookieAccessToken : undefined;
  let refreshedCookies: string[] = [];

  if (!accessToken && refreshToken) {
    const refreshed = await refreshSignIn(cookieAccessToken, refreshToken);
    if (refreshed) {
      accessToken = refreshed.accessToken;
      refreshedCookies = refreshed.cookies;
    }
  }

  const response = await requestAuth.run({ accessToken, sendToken: true }, () => next());
  return refreshedCookies.length > 0 && !setsAuthCookies(response) ? withCookies(response, refreshedCookies) : response;
};

/**
 * Runs `call` so the backend calls it makes carry no sign-in token: sign-in, sign-up, invites, verification and other
 * flows that must never act as whoever happens to be signed in in this browser.
 */
export function withoutLogin<T>(call: () => T): T {
  const state = requestAuth.getStore();
  return state ? requestAuth.run({ ...state, sendToken: false }, call) : call();
}
