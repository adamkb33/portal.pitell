import type { CreateClientConfig } from '../generated/timesheet/client.gen';
import { createLoggedAxios } from './create-logged-axios';

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  axios: createLoggedAxios('timesheet'),
  baseURL: import.meta.env.VITE_API_TIMESHEET_SERVICE_URL || 'http://localhost:8080/timesheet-service',
  throwOnError: true,
});
