import type { AuthenticatedUserPayload } from '~/api/generated/base/types.gen';
import { accessTokenCookie, refreshTokenCookie } from '~/routes/auth/_features/auth.cookies.server';
import { toAuthPayload } from '~/routes/auth/_utils/token-payload';

export type CompanyContextSession = {
  companyId: number;
  orgNumber: string;
};

export const getAuthPayloadFromRequest = async (request: Request): Promise<AuthenticatedUserPayload | null> => {
  const cookieHeader = request.headers.get('Cookie');
  const accessToken = await accessTokenCookie.parse(cookieHeader);
  const authPayload = accessToken ? toAuthPayload(accessToken) : null;
  return authPayload;
};

export const getAccessTokenFromRequest = async (request: Request) => {
  const cookieHeader = request.headers.get('Cookie');
  return await accessTokenCookie.parse(cookieHeader);
};
export const getTokensFromRequest = async (request: Request) => {
  const cookieHeader = request.headers.get('Cookie');
  return {
    accessToken: await accessTokenCookie.parse(cookieHeader),
    refreshToken: await refreshTokenCookie.parse(cookieHeader),
  };
};

export type UserSesion = {
  user: AuthenticatedUserPayload | null;
  accessToken: string;
};

export const getUserSession = async (request: Request): Promise<UserSesion> => {
  const cookieHeader = request.headers.get('Cookie');
  const accessToken = await accessTokenCookie.parse(cookieHeader);
  const authPayload = accessToken ? toAuthPayload(accessToken) : null;
  return {
    accessToken: accessToken,
    user: authPayload,
  };
};
