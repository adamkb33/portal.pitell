import type { CreateClientConfig } from '../generated/timesheet/client.gen';

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseURL: import.meta.env.VITE_API_TIMESHEET_SERVICE_URL || 'http://localhost:8080/timesheet-service',
  throwOnError: true,
});
