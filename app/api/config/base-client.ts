import type { CreateClientConfig } from '../generated/base/client.gen';
import { createLoggedAxios } from './create-logged-axios';
import { getServiceBaseUrl } from './service-url';

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  axios: createLoggedAxios('base'),
  baseURL: getServiceBaseUrl('base-service'),
  throwOnError: true,
});
