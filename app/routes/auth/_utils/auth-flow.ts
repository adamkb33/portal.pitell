import type {
  ProviderCompleteProfileResponseDto,
  SignInResponseDto,
  SignUpResponseDto,
  UserAuthStatusDto,
} from '~/api/generated/base';
import { ROUTES_MAP } from '~/lib/route-tree';

type NextStep =
  | SignInResponseDto['nextStep']
  | SignUpResponseDto['nextStep']
  | ProviderCompleteProfileResponseDto['nextStep']
  | UserAuthStatusDto['nextStep']
  | null
  | undefined;

type ResolveNextStepOptions = {
  userId?: number | null;
  emailSent?: boolean | null;
  mobileSent?: boolean | null;
};

function buildHref(href: string, params?: URLSearchParams) {
  const search = params?.toString();
  return search ? `${href}?${search}` : href;
}

export function resolveAuthNextStepHref(nextStep: NextStep, options: ResolveNextStepOptions = {}) {
  switch (nextStep) {
    case 'COLLECT_EMAIL': {
      const params = new URLSearchParams();
      if (options.userId) {
        params.set('userId', String(options.userId));
      }
      return buildHref(ROUTES_MAP['auth.collect-email'].href, params);
    }
    case 'COLLECT_MOBILE': {
      const params = new URLSearchParams();
      if (options.userId) {
        params.set('userId', String(options.userId));
      }
      return buildHref(ROUTES_MAP['auth.collect-mobile'].href, params);
    }
    case 'VERIFY_EMAIL': {
      const params = new URLSearchParams();
      params.set('emailSent', String(options.emailSent ?? false));
      params.set('mobileSent', String(options.mobileSent ?? false));
      return buildHref(ROUTES_MAP['auth.check-email'].href, params);
    }
    case 'VERIFY_MOBILE':
      return ROUTES_MAP['auth.verify-mobile'].href;
    case 'DONE':
      return '/';
    case 'SIGN_IN':
      return ROUTES_MAP['auth.sign-in'].href;
    default:
      return null;
  }
}

export function resolveAuthStatusNextStepHref(status: UserAuthStatusDto | null | undefined) {
  return resolveAuthNextStepHref(status?.nextStep, {
    userId: status?.user?.id ?? null,
  });
}
