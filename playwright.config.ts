import { defineConfig, devices } from '@playwright/test';
import { ensureDockerHost } from './scripts/e2e/docker-host';
import {
  backendPort,
  backendUrl,
  e2eAdmin,
  frontendPort,
  frontendUrl,
  jwtSecret,
} from './scripts/e2e/stack';

ensureDockerHost();

// The tests in tests/e2e sign in as the seeded company admin and talk to the self-started backend.
process.env.E2E_GATEWAY_URL = backendUrl;
process.env.E2E_COMPANY_USER_EMAIL = e2eAdmin.email;
process.env.E2E_COMPANY_USER_PASSWORD = e2eAdmin.password;
process.env.E2E_COMPANY_ID = String(e2eAdmin.companyId);

// One config for every E2E suite. `npx playwright test` starts the database, backend and portal itself,
// seeds them once (the "environment" project), then runs the suites against that stack in order.
export default defineConfig({
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results/artifacts',
  webServer: [
    {
      name: 'backend',
      // Starts the containers, then the backend; see scripts/e2e/start-backend.ts.
      command: './node_modules/.bin/tsx scripts/e2e/start-backend.ts',
      env: {
        E2E_BACKEND_PORT: String(backendPort),
        E2E_FRONTEND_PORT: String(frontendPort),
        AUTH_ACCESS_TOKEN_SECRET: jwtSecret,
      },
      url: `${backendUrl}/actuator/health`,
      reuseExistingServer: false,
      // Includes pulling images and a cold Gradle build. Raise it on a slow CI runner.
      timeout: Number(process.env.E2E_BACKEND_TIMEOUT_MS ?? 360_000),
      stdout: 'pipe',
      stderr: 'pipe',
      gracefulShutdown: { signal: 'SIGTERM', timeout: 30_000 },
    },
    {
      name: 'frontend',
      command: `./node_modules/.bin/react-router dev --host 127.0.0.1 --port ${frontendPort}`,
      env: {
        VITE_API_GATEWAY_URL: backendUrl,
        VITE_API_JWT_SECRET: jwtSecret,
        pitell_PORTAL_BASE_URL: frontendUrl,
      },
      url: `${frontendUrl}/booking/public/appointment`,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
    },
  ],
  use: {
    baseURL: frontendUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Migrations ran cleanly and the booking seed (including the admin user) is loaded. Everything else depends on it.
    {
      name: 'environment',
      testDir: './tests/e2e-booking',
      testMatch: /environment\.setup\.ts/,
    },
    {
      name: 'booking-flow',
      testDir: './tests/e2e-booking',
      testIgnore: /environment\.setup\.ts/,
      dependencies: ['environment'],
      use: { ...devices['Pixel 5'], locale: 'nb-NO', timezoneId: 'Europe/Oslo' },
    },
    {
      name: 'auth-refresh',
      testDir: './tests/e2e-refresh',
      dependencies: ['environment'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'company',
      testDir: './tests/e2e',
      dependencies: ['environment'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
