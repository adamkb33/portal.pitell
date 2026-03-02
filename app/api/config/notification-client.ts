import type { CreateClientConfig } from '../generated/notification/client.gen';
import { createLoggedAxios } from './create-logged-axios';

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  axios: createLoggedAxios('notification', {
    withCredentials: true,
  }),
  baseURL: import.meta.env.VITE_API_NOTIFICATION_SERVICE_URL || 'http://localhost:8080/notification-service',
  throwOnError: true,
  withCredentials: true,
});
