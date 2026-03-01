// openapi-ts.config.ts
import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig([
  {
    client: '@hey-api/client-axios',
    input: process.env.VITE_API_BASE_SERVICE_DOCS_URL || 'http://localhost:8080/base-service/api-docs',
    output: './app/api/generated/base',
    plugins: [
      {
        name: '@hey-api/client-axios',
        runtimeConfigPath: '~/api/config/base-client',
      },
      {
        name: '@hey-api/sdk',
        asClass: true,
      },
    ],
  },
  {
    client: '@hey-api/client-axios',
    input: process.env.VITE_API_BOOKING_SERVICE_DOCS_URL || 'http://localhost:8080/booking-service/api-docs',
    output: './app/api/generated/booking',
    plugins: [
      {
        name: '@hey-api/client-axios',
        runtimeConfigPath: '~/api/config/booking-client',
      },
      {
        name: '@hey-api/sdk',
        asClass: true,
      },
    ],
  },
  {
    client: '@hey-api/client-axios',
    input: process.env.VITE_API_TIMESHEET_SERVICE_DOCS_URL || 'http://localhost:8080/timesheet-service/api-docs',
    output: './app/api/generated/timesheet',
    plugins: [
      {
        name: '@hey-api/client-axios',
        runtimeConfigPath: '~/api/config/timesheet-client',
      },
      {
        name: '@hey-api/sdk',
        asClass: true,
      },
    ],
  },
  {
    client: '@hey-api/client-axios',
    input: process.env.VITE_API_NOTIFICATION_SERVICE_DOCS_URL || 'http://localhost:8080/notification-service/api-docs',
    output: './app/api/generated/notification',
    plugins: [
      {
        name: '@hey-api/client-axios',
        runtimeConfigPath: '~/api/config/notification-client',
      },
      {
        name: '@hey-api/sdk',
        asClass: true,
      },
    ],
  },
]);
