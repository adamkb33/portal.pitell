import type { CreateClientConfig } from '../generated/booking/client.gen';
import { createLoggedAxios } from './create-logged-axios';
import { getServiceBaseUrl } from './service-url';

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  axios: createLoggedAxios('booking'),
  baseURL: getServiceBaseUrl('booking-service'),
  throwOnError: true,
});
