import type { AuthenticatedUserPayload } from '~/api/generated/types.gen';
import { accessTokenCookie, refreshTokenCookie } from '~/routes/auth/_features/auth.cookies.server';
import { toAuthPayload } from '~/routes/auth/_utils/token-payload';
import { requestAccessToken } from '~/api/utils/request-auth';

/**
 * The request's access token: inside a request, the one the auth middleware settled on (refreshed if it had expired,
 * undefined when signed out); outside one (scripts, unit tests), the cookie. The cookie alone can still hold an
 * expired token the middleware has just replaced.
 */
export const readAccessToken = async (request: Request): Promise<string | undefined> => {
  const fromRequest = requestAccessToken();
  if (fromRequest.handled) return fromRequest.accessToken;
  return (await accessTokenCookie.parse(request.headers.get('Cookie'))) || undefined;
};

export type CompanyContextSession = {
  companyId: number;
  orgNumber: string;
};

export const getAuthPayloadFromRequest = async (request: Request): Promise<AuthenticatedUserPayload | null> => {
  const accessToken = await readAccessToken(request);
  const authPayload = accessToken ? toAuthPayload(accessToken) : null;
  return authPayload;
};

export const getAccessTokenFromRequest = readAccessToken;
export const getTokensFromRequest = async (request: Request) => {
  const cookieHeader = request.headers.get('Cookie');
  return {
    accessToken: await readAccessToken(request),
    refreshToken: await refreshTokenCookie.parse(cookieHeader),
  };
};

export type UserSesion = {
  user: AuthenticatedUserPayload | null;
  accessToken: string | undefined;
};

export const getUserSession = async (request: Request): Promise<UserSesion> => {
  const accessToken = await readAccessToken(request);
  const authPayload = accessToken ? toAuthPayload(accessToken) : null;
  return {
    accessToken: accessToken,
    user: authPayload,
  };
};
