import type { CreateClientConfig } from '../generated/notification/client.gen';

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseURL: import.meta.env.VITE_API_NOTIFICATION_SERVICE_URL || 'http://localhost:8080/notification-service',
  throwOnError: true,
  withCredentials: true,
});
