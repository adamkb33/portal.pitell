import type { CreateClientConfig } from '../generated/client.gen';
import { createLoggedAxios } from './create-logged-axios';
import { getGatewayUrl } from './service-url';

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  axios: createLoggedAxios('api', { withCredentials: true }),
  baseURL: getGatewayUrl(),
  throwOnError: true,
  withCredentials: true,
});
