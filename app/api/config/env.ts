export const ENV = {
  NODE_ENV: 'development',
  JWT_SECRET: import.meta.env.VITE_API_JWT_SECRET as string,
  GATEWAY_URL: import.meta.env.VITE_API_GATEWAY_URL as string,
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID as string,
};
