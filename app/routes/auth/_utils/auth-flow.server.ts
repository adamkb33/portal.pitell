import type { ProviderCompleteProfileResponseDto, SignInResponseDto, SignUpResponseDto } from '~/api/generated/base';
import { VerificationTokenService } from '~/routes/booking/public/appointment/session/contact/_services/verification-token.service.server';
import { resolveAuthNextStepHref } from './auth-flow';

type AuthFlowPayload = SignInResponseDto | SignUpResponseDto | ProviderCompleteProfileResponseDto | null | undefined;

export type PostAuthRedirect = {
  nextStepHref: string | null;
  verificationCookieHeader: string | null;
};

export async function resolveAuthPostRedirect(payload: AuthFlowPayload): Promise<PostAuthRedirect> {
  if (!payload) {
    return {
      nextStepHref: null,
      verificationCookieHeader: null,
    };
  }

  const nextStepHref = resolveAuthNextStepHref(payload.nextStep, {
    userId: payload.userId ?? null,
    emailSent: 'emailSent' in payload ? payload.emailSent ?? null : null,
    mobileSent: 'mobileSent' in payload ? payload.mobileSent ?? null : null,
  });

  const verificationCookieHeader =
    (await VerificationTokenService.buildVerificationCookieHeaderFromDto(
      'verificationTokenDto' in payload ? payload.verificationTokenDto ?? null : null,
    )) ??
    (await VerificationTokenService.buildVerificationCookieHeaderFromDto(
      'verificationToken' in payload ? payload.verificationToken ?? null : null,
    ));

  return {
    nextStepHref,
    verificationCookieHeader,
  };
}
