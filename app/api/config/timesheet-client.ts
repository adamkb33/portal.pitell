import type { CreateClientConfig } from '../generated/timesheet/client.gen';
import { createLoggedAxios } from './create-logged-axios';
import { getServiceBaseUrl } from './service-url';

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  axios: createLoggedAxios('timesheet'),
  baseURL: getServiceBaseUrl('timesheet-service'),
  throwOnError: true,
});
