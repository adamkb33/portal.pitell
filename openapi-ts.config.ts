// openapi-ts.config.ts
import { defineConfig } from '@hey-api/openapi-ts';

const gatewayUrl = (process.env.VITE_API_GATEWAY_URL || 'http://localhost:8010').replace(/\/+$/, '');

export default defineConfig({
  client: '@hey-api/client-axios',
  input: `${gatewayUrl}/v3/api-docs`,
  output: './app/api/generated',
  plugins: [
    {
      name: '@hey-api/client-axios',
      runtimeConfigPath: '~/api/config/api-client',
    },
    {
      name: '@hey-api/sdk',
      asClass: true,
    },
  ],
});
