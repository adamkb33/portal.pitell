import type { CreateClientConfig } from '../generated/notification/client.gen';
import { createLoggedAxios } from './create-logged-axios';
import { getServiceBaseUrl } from './service-url';

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  axios: createLoggedAxios('notification', {
    withCredentials: true,
  }),
  baseURL: getServiceBaseUrl('notification-service'),
  throwOnError: true,
  withCredentials: true,
});
