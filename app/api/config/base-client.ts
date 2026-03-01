import type { CreateClientConfig } from '../generated/base/client.gen';

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseURL: import.meta.env.VITE_API_BASE_SERVICE_URL || 'http://localhost:8080/base-service',
  throwOnError: true,
});
