// openapi-ts.config.ts
import { defineConfig } from '@hey-api/openapi-ts';

const gatewayUrl = (process.env.VITE_API_GATEWAY_URL || 'http://localhost:8080').replace(/\/+$/, '');
const serviceDocsUrl = (serviceName: string) => `${gatewayUrl}/${serviceName}/api-docs`;

export default defineConfig([
  {
    client: '@hey-api/client-axios',
    input: serviceDocsUrl('base-service'),
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
    input: serviceDocsUrl('booking-service'),
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
    input: serviceDocsUrl('timesheet-service'),
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
    input: serviceDocsUrl('notification-service'),
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
