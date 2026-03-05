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
    emailDelivery: 'emailDelivery' in payload ? payload.emailDelivery ?? null : null,
    mobileDelivery: 'mobileDelivery' in payload ? payload.mobileDelivery ?? null : null,
  });

  const verificationCookieHeader = await VerificationTokenService.buildVerificationCookieHeaderFromDto(
    'verificationToken' in payload ? payload.verificationToken ?? null : null,
  );

  return {
    nextStepHref,
    verificationCookieHeader,
  };
}
