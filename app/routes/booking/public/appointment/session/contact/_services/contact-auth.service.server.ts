import { PublicAppointmentSessionController } from '~/api/generated/booking';
import {
  AuthController,
  type ProviderCompleteProfileResponseDto,
  type SignInResponseDto,
  type SignUpResponseDto,
} from '~/api/generated/base';
import { AppointmentSessionService } from '../../_services/appointment-session.service.server';
import { authService } from '~/lib/auth-service';
import { resolveAuthNextStepHref } from '../_utils/auth.utils';
import { VerificationTokenService } from './verification-token.service.server';
import { withAuth } from '~/api/utils/with-auth';

type SignInLike = SignInResponseDto | null | undefined;
type SignUpLike = SignUpResponseDto | null | undefined;
type CompleteProfileLike = ProviderCompleteProfileResponseDto | null | undefined;
type AuthLike = SignInLike | SignUpLike | CompleteProfileLike;

export type PostAuthResolution = {
  nextStepHref: string | null;
  verificationCookieHeader: string | null;
};

export class ContactAuthService {
  static async signInWithProvider({
    provider,
    idToken,
    redirectUrl,
  }: {
    provider: 'GOOGLE';
    idToken: string;
    redirectUrl?: string;
  }) {
    const response = await AuthController.signIn({
      query: {
        redirectUrl: redirectUrl || undefined,
      },
      body: {
        provider,
        idToken,
      },
    });
    return response.data?.data ?? null;
  }

  static async signInLocal({
    emailOrMobile,
    password,
    redirectUrl,
  }: {
    emailOrMobile: string;
    password: string;
    redirectUrl?: string;
  }) {
    const response = await AuthController.signIn({
      query: {
        redirectUrl: redirectUrl || undefined,
      },
      body: {
        provider: 'LOCAL',
        emailOrMobile,
        password,
      },
    });
    return response.data?.data ?? null;
  }

  static async signUp({
    givenName,
    familyName,
    email,
    password,
    password2,
    mobileNumber,
    redirectUrl,
  }: {
    givenName: string;
    familyName: string;
    email: string;
    password: string;
    password2: string;
    mobileNumber: string;
    redirectUrl?: string;
  }) {
    const response = await AuthController.signUp({
      query: {
        redirectUrl: redirectUrl || undefined,
      },
      body: {
        givenName,
        familyName,
        email,
        password,
        password2,
        mobileNumber,
      },
    });
    return response.data?.data ?? null;
  }

  static async completeProfile({
    userId,
    email,
    mobileNumber,
  }: {
    userId: number;
    email?: string;
    mobileNumber?: string;
  }) {
    const response = await AuthController.providerCompleteProfile({
      body: {
        userId,
        email,
        mobileNumber,
      },
    });
    return response.data?.data ?? null;
  }

  static async verifyMobile({ verificationSessionToken, code }: { verificationSessionToken: string; code: string }) {
    const response = await AuthController.verifyMobile({
      body: {
        verificationSessionToken,
        code,
      },
    });

    const payload = response.data?.data ?? null;
    const nextStep = payload?.nextStep ?? 'DONE';
    const authTokens = payload?.authTokens;

    if (!authTokens) {
      return {
        nextStep,
        signedIn: false,
        headers: undefined as HeadersInit | undefined,
      };
    }

    const headers = await authService.setAuthCookies(
      authTokens.accessToken,
      authTokens.refreshToken,
      authTokens.accessTokenExpiresAt,
      authTokens.refreshTokenExpiresAt,
    );

    return {
      nextStep,
      signedIn: true,
      headers,
    };
  }

  static async getUserStatus(request: Request) {
    return await withAuth(request, async () => {
      const response = await AuthController.userStatus();
      return response.data?.data ?? null;
    });
  }

  static async resendVerification({
    email,
    verificationSessionToken,
    redirectUrl,
    sendEmail,
    sendMobile,
  }: {
    email?: string;
    verificationSessionToken?: string;
    redirectUrl?: string;
    sendEmail: boolean;
    sendMobile: boolean;
  }) {
    const requestBody = {
      verificationSessionToken: verificationSessionToken || undefined,
      email: email || undefined,
      sendEmail,
      sendMobile,
    };

    const response = sendEmail
      ? await AuthController.resendVerificationEmailOnly({
          query: { redirectUrl: redirectUrl || undefined },
          body: requestBody,
        })
      : await AuthController.resendVerificationMobileOnly({
          query: { redirectUrl: redirectUrl || undefined },
          body: requestBody,
        });

    const nextToken = response.data?.data?.verificationToken?.value ?? verificationSessionToken ?? null;
    const nextTokenExpiresAt = response.data?.data?.verificationToken?.expiresAt ?? null;
    const successMessage = response.data?.message?.value ?? 'Ny kode sendt.';

    return {
      nextToken,
      nextTokenExpiresAt,
      successMessage,
      data: response.data?.data ?? null,
    };
  }

  static async attachUserToSession(request: Request, userId: number) {
    await AppointmentSessionService.attachUser(request, userId);
  }

  static async setPendingSessionUser(sessionId: string, userId: number) {
    const response = await PublicAppointmentSessionController.setPendingAppointmentSessionUser({
      path: { sessionId },
      query: { userId },
    });
    return response.data?.data ?? null;
  }

  static async resolvePostAuthRedirect(payload: AuthLike): Promise<PostAuthResolution> {
    if (!payload) {
      return {
        nextStepHref: null,
        verificationCookieHeader: null,
      };
    }

    const nextStepHref = resolveAuthNextStepHref(payload.nextStep);
    const verificationCookieHeader = await VerificationTokenService.buildVerificationCookieHeaderFromDto(
      'verificationToken' in payload ? payload.verificationToken ?? null : null,
    );

    return {
      nextStepHref,
      verificationCookieHeader,
    };
  }
}
