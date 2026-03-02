import type { CreateClientConfig } from '../generated/base/client.gen';
import { createLoggedAxios } from './create-logged-axios';

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  axios: createLoggedAxios('base'),
  baseURL: import.meta.env.VITE_API_BASE_SERVICE_URL || 'http://localhost:8080/base-service',
  throwOnError: true,
});
