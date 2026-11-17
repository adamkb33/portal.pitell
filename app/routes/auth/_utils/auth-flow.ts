import type { ProviderCompleteProfileResponseDto, SignInResponseDto, SignUpResponseDto } from '~/api/generated';
import { ROUTES_MAP } from '~/lib/routing/route-tree';

type NextStep =
  | SignInResponseDto['nextStep']
  | SignUpResponseDto['nextStep']
  | ProviderCompleteProfileResponseDto['nextStep']
  | null
  | undefined;

/** The page for an auth step; null for an unknown step. */
export function resolveAuthNextStepHref(nextStep: NextStep) {
  switch (nextStep) {
    // The account is the signed-in user, so the collect pages take no user id.
    case 'COLLECT_EMAIL':
      return ROUTES_MAP['auth.collect-email'].href;
    case 'COLLECT_MOBILE':
      return ROUTES_MAP['auth.collect-mobile'].href;
    case 'VERIFY_MOBILE':
      return ROUTES_MAP['auth.verify-mobile'].href;
    case 'DONE':
      return '/';
    default:
      return null;
  }
}
