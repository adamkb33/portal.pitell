export const ENV = {
  NODE_ENV: 'development',
  JWT_SECRET: import.meta.env.VITE_API_JWT_SECRET as string,
  GATEWAY_URL: import.meta.env.VITE_API_GATEWAY_URL as string,
  BASE_SERVICE_BASE_URL: import.meta.env.VITE_API_BASE_SERVICE_URL as string,
  BOOKING_BASE_URL: import.meta.env.VITE_API_BOOKING_SERVICE_URL as string,
  TIMESHEET_BASE_URL: import.meta.env.VITE_API_TIMESHEET_SERVICE_URL as string,
  NOTIFICATION_BASE_URL: import.meta.env.VITE_API_NOTIFICATION_SERVICE_URL as string,
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID as string,
};
