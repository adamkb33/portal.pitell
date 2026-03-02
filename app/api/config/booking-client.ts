import type { CreateClientConfig } from '../generated/booking/client.gen';
import { createLoggedAxios } from './create-logged-axios';

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  axios: createLoggedAxios('booking'),
  baseURL: import.meta.env.VITE_API_BOOKING_SERVICE_URL || 'http://localhost:8080/booking-service',
  throwOnError: true,
});
