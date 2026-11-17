import { randomBytes } from 'node:crypto';
import { createCookie } from 'react-router';
import type { SignInCodeResponseDto } from '~/api/generated';

/** What the sign-in steps share: who is signing in, where to go after, and the code or reset token in play. */
export type SignInFlow = {
  identifier: string;
  returnTo: string | null;
  code?: {
    codeId: string;
    channel: SignInCodeResponseDto['channel'];
    sentTo: string;
    resendAvailableAt: string;
  };
  resetPasswordToken?: string;
};

// Signed and httpOnly, so the mobile number or email never sits in a URL and the reset token never reaches the page.
const signInFlowCookie = createCookie('sign_in_flow', {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/auth',
  maxAge: 15 * 60,
  secrets: [process.env.SESSION_SECRET || randomBytes(32).toString('hex')],
});

export async function readSignInFlow(request: Request): Promise<SignInFlow | null> {
  const value = await signInFlowCookie.parse(request.headers.get('Cookie'));
  return value && typeof value === 'object' && typeof value.identifier === 'string' ? (value as SignInFlow) : null;
}

export function writeSignInFlow(flow: SignInFlow): Promise<string> {
  return signInFlowCookie.serialize(flow);
}

export function clearSignInFlow(): Promise<string> {
  return signInFlowCookie.serialize('', { maxAge: 0 });
}
