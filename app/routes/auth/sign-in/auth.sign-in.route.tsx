// auth.sign-in.route.tsx
import { Link, Form, useNavigation, redirect } from 'react-router';
import { data } from 'react-router';
import { ROUTES_MAP } from '~/lib/route-tree';
import { AuthFormContainer } from '../_components/auth.form-container';
import { AuthFormField } from '../_components/auth.form-field';
import { AuthFormButton } from '../_components/auth.form-button';
import { ProviderButtons } from '../_components/provider-buttons';
import { AuthController } from '~/api/generated/base';
import { resolveErrorPayload } from '~/lib/api-error';
import { verificationSessionToken } from '~/lib/auth.server';
import type { Route } from './+types/auth.sign-in.route';
import { authService } from '~/lib/auth-service';
import { redirectWithWarning } from '~/routes/company/_lib/flash-message.server';
import { logger } from '~/lib/logger';
import React from 'react';

function redactEmail(value: string) {
  const normalized = value.trim();
  const [localPart = '', domain = ''] = normalized.split('@');
  if (!normalized) {
    return '';
  }
  if (!domain) {
    return `${localPart.slice(0, 2)}***`;
  }
  return `${localPart.slice(0, 2)}***@${domain}`;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const provider = String(formData.get('provider') || 'LOCAL');
  const idToken = String(formData.get('idToken') || '');
  const email = String(formData.get('email') || '');
  const password = String(formData.get('password') || '');
  const redirectUrl = String(formData.get('redirectUrl') || '');
  const isGoogleLogin = provider === 'GOOGLE';

  logger.info('[auth.sign-in] Action started', {
    provider,
    isGoogleLogin,
    email: redactEmail(email),
    hasPassword: password.length > 0,
    hasIdToken: idToken.length > 0,
    redirectUrl: redirectUrl || null,
  });

  if (isGoogleLogin && !idToken) {
    logger.warn('[auth.sign-in] Missing Google idToken', {
      redirectUrl: redirectUrl || null,
    });
    return data({ error: 'Kunne ikke logge inn med Google. Prøv igjen.' }, { status: 400 });
  }

  try {
    const response = await AuthController.signIn({
      query: {
        redirectUrl: redirectUrl || undefined,
      },
      body: isGoogleLogin ? { provider: 'GOOGLE', idToken } : { provider: 'LOCAL', emailOrMobile: email, password },
    });
    const payload = response.data?.data;

    logger.info('[auth.sign-in] Sign-in response received', {
      provider,
      email: redactEmail(email),
      nextStep: payload?.nextStep ?? null,
      hasAuthTokens: Boolean(payload?.authTokens),
      hasVerificationToken: Boolean(payload?.verificationTokenDto),
      emailSent: payload?.emailSent ?? null,
      mobileSent: payload?.mobileSent ?? null,
    });

    if (payload?.verificationTokenDto) {
      const cookie = await verificationSessionToken.serialize(payload.verificationTokenDto.value, {
        expires: new Date(payload.verificationTokenDto.expiresAt),
      });
      const headers = new Headers();
      headers.append('Set-Cookie', cookie);

      if (payload.nextStep === 'VERIFY_EMAIL') {
        logger.info('[auth.sign-in] Redirecting to check-email', {
          email: redactEmail(email),
          emailSent: payload.emailSent ?? false,
          mobileSent: payload.mobileSent ?? false,
        });
        const params = new URLSearchParams({
          emailSent: String(payload.emailSent ?? false),
          mobileSent: String(payload.mobileSent ?? false),
        });
        return redirect(`${ROUTES_MAP['auth.check-email'].href}?${params.toString()}`, { headers });
      }

      logger.info('[auth.sign-in] Returning verification payload to client', {
        email: redactEmail(email),
        nextStep: payload.nextStep,
      });
      return data(payload, { headers });
    }

    if (payload?.authTokens) {
      logger.info('[auth.sign-in] Auth tokens issued, redirecting to home', {
        email: redactEmail(email),
      });
      const headers = await authService.setAuthCookies(
        payload.authTokens.accessToken,
        payload.authTokens.refreshToken,
        payload.authTokens.accessTokenExpiresAt,
        payload.authTokens.refreshTokenExpiresAt,
      );
      return redirect('/', { headers });
    }

    logger.warn('[auth.sign-in] Missing expected sign-in payload branch', {
      provider,
      email: redactEmail(email),
      nextStep: payload?.nextStep ?? null,
    });
    return redirectWithWarning(request, ROUTES_MAP['auth.sign-in'].href, 'Kunne ikke logge inn. Prøv igjen.');
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke logge inn. Prøv igjen.');
    logger.error('[auth.sign-in] Sign-in failed', {
      provider,
      email: redactEmail(email),
      redirectUrl: redirectUrl || null,
      status: status ?? 400,
      error,
    });
    return data({ error: message }, { status: status ?? 400 });
  }
}

export default function AuthSignIn({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const errorMessage =
    actionData && typeof actionData === 'object' && 'error' in actionData ? String(actionData.error) : undefined;

  React.useEffect(() => {
    if (navigation.state === 'submitting') {
      logger.info('[auth.sign-in.client] Submission started');
    }
  }, [navigation.state]);

  React.useEffect(() => {
    if (!actionData || typeof actionData !== 'object') {
      return;
    }

    if ('error' in actionData) {
      logger.warn('[auth.sign-in.client] Action returned error', {
        error: String(actionData.error),
      });
      return;
    }

    logger.info('[auth.sign-in.client] Action returned payload', {
      nextStep: 'nextStep' in actionData ? String(actionData.nextStep) : null,
      emailSent: 'emailSent' in actionData ? Boolean(actionData.emailSent) : null,
      mobileSent: 'mobileSent' in actionData ? Boolean(actionData.mobileSent) : null,
      hasVerificationToken: 'verificationTokenDto' in actionData && Boolean(actionData.verificationTokenDto),
    });
  }, [actionData]);

  return (
    <AuthFormContainer
      title="Logg inn"
      description="Logg inn for å administrere ditt selskap og kundeforhold."
      error={errorMessage}
      secondaryAction={
        <div className="space-y-3 text-center">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Ny bruker?</p>
            <Link
              to={ROUTES_MAP['auth.sign-up'].href}
              className="inline-block text-sm font-medium text-foreground hover:underline"
            >
              Opprett konto →
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">Glemt passordet?</p>
          <Link
            to={ROUTES_MAP['auth.forgot-password'].href}
            className="inline-block text-sm font-medium text-foreground hover:underline"
          >
            Tilbakestill passord →
          </Link>
        </div>
      }
    >
      <Form method="post" className="space-y-4 md:space-y-6" aria-busy={isSubmitting}>
        <ProviderButtons disabled={isSubmitting} />

        <AuthFormField
          id="email"
          name="email"
          label="E-post"
          type="email"
          autoComplete="email"
          placeholder="e-post"
          disabled={isSubmitting}
        />

        <AuthFormField
          id="password"
          name="password"
          label="Passord"
          type="password"
          autoComplete="current-password"
          disabled={isSubmitting}
        />

        <div className="pt-2">
          <AuthFormButton isLoading={isSubmitting} loadingText="Logger inn…">
            Logg inn
          </AuthFormButton>
        </div>
      </Form>
    </AuthFormContainer>
  );
}
