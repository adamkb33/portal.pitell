import { redirect } from 'react-router';
import type { SignInResponseDto, SignUpResponseDto, UserAuthStatusDto } from '~/api/generated/identity';
import { verificationSessionToken } from '~/lib/auth.server';
import { ROUTES_MAP } from '~/lib/route-tree';

export function resolveAuthNextStepHref(
  nextStep: SignInResponseDto['nextStep'] | SignUpResponseDto['nextStep'] | null | undefined,
) {
  console.log('[resolveAuthNextStepHref] nextStep', nextStep);
  switch (nextStep) {
    case 'COLLECT_EMAIL':
      return ROUTES_MAP['booking.public.appointment.session.contact.collect-email'].href;
    case 'COLLECT_MOBILE':
      return ROUTES_MAP['booking.public.appointment.session.contact.collect-mobile'].href;
    case 'VERIFY_EMAIL':
      return ROUTES_MAP['booking.public.appointment.session.contact.verify-email'].href;
    case 'VERIFY_MOBILE':
      return ROUTES_MAP['booking.public.appointment.session.contact.verify-mobile'].href;
    case 'DONE':
      return ROUTES_MAP['booking.public.appointment.session.employee'].href;
    case 'SIGN_IN':
      return ROUTES_MAP['booking.public.appointment.session.employee'].href;
    default:
      return null;
  }
}

export function resolveAuthStatusNextStepHref(authStatus: UserAuthStatusDto | null | undefined) {
  return resolveAuthNextStepHref(authStatus?.nextStep);
}

export function redirectAuthStatusNextStepHref(authStatus: UserAuthStatusDto) {
  const nextStepHref = resolveAuthNextStepHref(authStatus.nextStep);
  if (nextStepHref) {
    return redirect(nextStepHref);
  }

  return redirect(ROUTES_MAP['booking.public.appointment.session.contact'].href);
}

export function shouldStoreVerificationToken(
  nextStep: SignInResponseDto['nextStep'] | SignUpResponseDto['nextStep'] | null | undefined,
) {
  return nextStep !== 'DONE' && nextStep !== 'SIGN_IN';
}

export function hasAuthErrors(
  payload:
    | SignInResponseDto
    | SignUpResponseDto
    | { error?: string; errors?: unknown; success?: boolean }
    | null
    | undefined,
) {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  return (
    ('error' in payload && typeof payload.error === 'string' && payload.error.length > 0) ||
    ('errors' in payload && Array.isArray(payload.errors) && payload.errors.length > 0) ||
    ('success' in payload && payload.success === false)
  );
}

export function getFetcherError(
  payload: SignInResponseDto | SignUpResponseDto | { error?: string } | null | undefined,
) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  if ('error' in payload && typeof payload.error === 'string') {
    return payload.error;
  }
  return null;
}

export async function requireVerificationToken(request: Request) {
  const cookieHeader = request.headers.get('Cookie');
  const token = await verificationSessionToken.parse(cookieHeader);
  if (!token || typeof token !== 'string') {
    return redirect(ROUTES_MAP['booking.public.appointment.session.contact'].href);
  }
  return token;
}

export const getVerificationTokenFromRequest = async (request: Request) => {
  const cookieHeader = request.headers.get('Cookie');
  const token = await verificationSessionToken.parse(cookieHeader);
  if (!token || typeof token !== 'string') {
    return null;
  }
  return token;
};
