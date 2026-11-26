import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { logger } from '~/lib/logger';
import { describeCall } from '~/lib/http-log';
import { toJwtClaims } from '~/routes/auth/_utils/token-payload';
import type { CreateClientConfig } from '../generated/client.gen';
import { currentAccessToken } from '../utils/request-auth';
import { createLoggedAxios } from './create-logged-axios';
import { getGatewayUrl } from './service-url';

/**
 * Signs the call with the sign-in token of the request it runs in (set once per request by the auth middleware; none
 * inside `withoutLogin`). The client is shared by every request on the server, so the token is read per call, never
 * stored on the client. A call that sets its own Authorization keeps it.
 *
 * Not hey-api's `auth` option: it only signs operations the API spec marks as secured, and the spec does not mark
 * the public booking endpoints, which still use the token when someone is signed in.
 */
function addRequestToken(config: InternalAxiosRequestConfig) {
  const accessToken = currentAccessToken();
  if (accessToken && !config.headers.has('Authorization')) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return config;
}

/** Which sign-in a refused call used: user, company and expiry from the token, never the token itself. */
function signInOf(config?: InternalAxiosRequestConfig) {
  const header = config?.headers?.get('Authorization');
  const token = typeof header === 'string' ? header.replace(/^Bearer /, '') : '';
  if (!token) return { signedIn: false };
  try {
    const { sub, companyId, exp } = toJwtClaims(token) as { sub?: unknown; companyId?: unknown; exp?: number };
    return { signedIn: true, userId: sub, companyId, expiresAt: exp ? new Date(exp * 1000).toISOString() : undefined };
  } catch {
    return { signedIn: true, token: 'unreadable' };
  }
}

function logRefusedSignIn(error: AxiosError) {
  const status = error.response?.status;
  if (status === 401 || status === 403) {
    logger.warn(`[auth] ${status} on ${describeCall(error.config)}`, signInOf(error.config));
  }
  return Promise.reject(error);
}

function createApiAxios() {
  const instance = createLoggedAxios('api', { withCredentials: true });
  instance.interceptors.request.use(addRequestToken);
  instance.interceptors.response.use(undefined, logRefusedSignIn);
  return instance;
}

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  axios: createApiAxios(),
  baseURL: getGatewayUrl(),
  throwOnError: true,
  withCredentials: true,
});
