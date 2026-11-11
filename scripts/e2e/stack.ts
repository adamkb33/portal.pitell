import { readFileSync } from 'node:fs';
import path from 'node:path';

// Shared by playwright.config.ts, scripts/e2e/start-backend.ts and the test fixtures.
// The ports differ from the dev defaults so the suite can run next to a locally running portal and backend.
export const frontendPort = Number(process.env.E2E_FRONTEND_PORT ?? 5174);
export const backendPort = Number(process.env.E2E_BACKEND_PORT ?? 8011);
export const frontendUrl = `http://127.0.0.1:${frontendPort}`;
export const backendUrl = `http://127.0.0.1:${backendPort}`;

// The backend signs access tokens with this secret and the portal verifies them with it.
export const jwtSecret = process.env.AUTH_ACCESS_TOKEN_SECRET ?? 'default-dev-secret';

// Company 1's admin from seedBookingFixture. "password" is the backend's legacy default password,
// which it accepts and re-hashes on first sign-in.
export const e2eAdmin = { email: 'provider@booking.e2e.invalid', password: 'password', companyId: 1 };

// start-backend.ts writes the throwaway database's URL here once the container is up.
export const databaseStateFile = path.join(process.cwd(), 'test-results', 'e2e-db.json');

export function readDatabaseUrl(): string {
  if (process.env.E2E_DATABASE_URL) return process.env.E2E_DATABASE_URL;
  return JSON.parse(readFileSync(databaseStateFile, 'utf8')).databaseUrl;
}
