// Local-dev defaults only apply when running the Vite dev server (import.meta.env.DEV).
// Production builds must provide real values via environment variables.
const DEV = import.meta.env.DEV;

export const ENV = {
  NODE_ENV: 'development',
  // Matches the backend's default auth.access-token.secret in application.yml
  JWT_SECRET: (import.meta.env.VITE_API_JWT_SECRET || (DEV ? 'default-dev-secret' : undefined)) as string,
  GATEWAY_URL: (import.meta.env.VITE_API_GATEWAY_URL || (DEV ? 'http://localhost:8010' : undefined)) as string,
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID as string,
};
