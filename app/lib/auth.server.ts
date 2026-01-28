import { createCookie } from 'react-router';

export const verificationSessionToken = createCookie('verification_session_token', {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
});
