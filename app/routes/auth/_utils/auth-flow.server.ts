import type { ProviderCompleteProfileResponseDto, SignInResponseDto, SignUpResponseDto } from '~/api/generated';
import { resolveAuthNextStepHref } from './auth-flow';
import { VerificationTokenService } from '~/routes/booking/public/appointment/session/contact/_services/verification-token.service.server';

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

  const nextStepHref = resolveAuthNextStepHref(payload.nextStep);

  const verificationCookieHeader = await VerificationTokenService.buildVerificationCookieHeaderFromDto(
    'verificationToken' in payload ? (payload.verificationToken ?? null) : null,
  );

  return {
    nextStepHref,
    verificationCookieHeader,
  };
}
