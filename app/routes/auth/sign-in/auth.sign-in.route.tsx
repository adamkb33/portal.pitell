// auth.sign-in.route.tsx
import { Link, Form, useNavigation, redirect } from 'react-router';
import { data } from 'react-router';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { SocialButtonRow } from '../_components/social-button-row';
import { AuthController } from '~/api/generated';
import { resolveErrorPayload } from '~/lib/api-error';
import type { Route } from './+types/auth.sign-in.route';
import { authService } from '~/lib/auth-service';
import { redirectWithError, redirectWithWarning } from '~/lib/flash-message.server';
import { logger } from '~/lib/logger';
import React from 'react';
import { resolveAuthPostRedirect } from '../_utils/auth-flow.server';
import { Button, FormField, AuthPageTemplate, Stack } from '~/ui';
import { Lock, User } from 'lucide-react';
import { getSafeReturnTo } from '~/utils';

function redactIdentifier(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return '';
  }

  if (normalized.includes('@')) {
    const [localPart = '', domain = ''] = normalized.split('@');
    if (!domain) {
      return `${localPart.slice(0, 2)}***`;
    }
    return `${localPart.slice(0, 2)}***@${domain}`;
  }

  // Treat as a phone/mobile number: mask all but the last 4 digits.
  const digitsOnly = normalized.replace(/\D/g, '');
  if (digitsOnly.length <= 4) {
    return '***';
  }
  return `***${digitsOnly.slice(-4)}`;
}

function buildSignInHref(redirectUrl?: string, returnTo?: string | null) {
  const params = new URLSearchParams();
  if (redirectUrl) params.set('redirectUrl', redirectUrl);
  if (returnTo) params.set('returnTo', returnTo);

  const search = params.toString();
  return search ? `${ROUTES_MAP['auth.sign-in'].href}?${search}` : ROUTES_MAP['auth.sign-in'].href;
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  return { returnTo: getSafeReturnTo(url.searchParams.get('returnTo')) };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const provider = String(formData.get('provider') || 'LOCAL');
  const idToken = String(formData.get('idToken') || '');
  const emailOrMobile = String(formData.get('emailOrMobile') || '');
  const password = String(formData.get('password') || '');
  const redirectUrl = String(formData.get('redirectUrl') || '');
  const returnTo = getSafeReturnTo(String(formData.get('returnTo') || ''));
  // The booking flow has its own sign-in form that posts here; failures send the customer back to that form.
  const signInHref =
    getSafeReturnTo(String(formData.get('retryTo') || '')) ?? buildSignInHref(redirectUrl || undefined, returnTo);
  const isGoogleLogin = provider === 'GOOGLE';

  logger.info('[auth.sign-in] Action started', {
    provider,
    isGoogleLogin,
    emailOrMobile: redactIdentifier(emailOrMobile),
    hasPassword: password.length > 0,
    hasIdToken: idToken.length > 0,
    redirectUrl: redirectUrl || null,
  });

  if (isGoogleLogin && !idToken) {
    logger.warn('[auth.sign-in] Missing Google idToken', {
      redirectUrl: redirectUrl || null,
    });
    return redirectWithError(request, signInHref, 'Kunne ikke logge inn med Google. Prøv igjen.');
  }

  try {
    const response = await AuthController.signIn({
      query: {
        redirectUrl: redirectUrl || undefined,
      },
      body: isGoogleLogin ? { provider: 'GOOGLE', idToken } : { provider: 'LOCAL', emailOrMobile, password },
    });
    const payload = response.data?.data;

    logger.info('[auth.sign-in] Sign-in response received', {
      provider,
      emailOrMobile: redactIdentifier(emailOrMobile),
      nextStep: payload?.nextStep ?? null,
      hasAuthTokens: Boolean(payload?.authTokens),
      hasVerificationToken: Boolean(payload?.verificationToken),
      emailDelivery: payload?.emailDelivery?.status ?? null,
      mobileDelivery: payload?.mobileDelivery?.status ?? null,
    });

    if (payload?.nextStep) {
      const { nextStepHref, verificationCookieHeader } = await resolveAuthPostRedirect(payload);
      const headers = new Headers();
      let resolvedNextStepHref = nextStepHref;
      let authTokens = payload.authTokens ?? null;
      let forcedCompanyContextSelection = false;

      if (payload.authTokens) {
        if (payload.nextStep === 'DONE') {
          const existingCompanyId = authService.getCompanyIdFromToken(payload.authTokens.accessToken);

          if (!existingCompanyId) {
            try {
              const companyContextsResponse = await AuthController.getCompanyContexts({
                headers: {
                  Authorization: `Bearer ${payload.authTokens.accessToken}`,
                },
              });
              const companyContexts = companyContextsResponse.data?.data ?? [];

              if (companyContexts.length === 1) {
                const companySignInResponse = await AuthController.companySignIn({
                  body: { companyId: companyContexts[0].id },
                  headers: {
                    Authorization: `Bearer ${payload.authTokens.accessToken}`,
                  },
                });

                if (companySignInResponse.data?.data) {
                  authTokens = companySignInResponse.data.data;
                }
              } else if (companyContexts.length > 1) {
                resolvedNextStepHref = returnTo
                  ? `${ROUTES_MAP['user.company-context'].href}?returnTo=${encodeURIComponent(returnTo)}`
                  : ROUTES_MAP['user.company-context'].href;
                forcedCompanyContextSelection = true;
              }
            } catch (companyContextError) {
              logger.warn('[auth.sign-in] Failed to resolve company context after DONE', {
                emailOrMobile: redactIdentifier(emailOrMobile),
                error: companyContextError,
              });
            }
          }
        }

        if (authTokens) {
          const authCookieHeaders = await authService.setAuthCookies(
            authTokens.accessToken,
            authTokens.refreshToken,
            authTokens.accessTokenExpiresAt,
            authTokens.refreshTokenExpiresAt,
          );
          for (const [key, value] of new Headers(authCookieHeaders).entries()) {
            headers.append(key, value);
          }
        }
      }

      if (verificationCookieHeader) {
        headers.append('Set-Cookie', verificationCookieHeader);
      }

      // Send them back to exactly where they were, but never skip a required step
      // (verification, company selection) to get there.
      if (payload.nextStep === 'DONE' && !forcedCompanyContextSelection && returnTo) {
        resolvedNextStepHref = returnTo;
      }

      logger.info('[auth.sign-in] Redirecting to auth next step', {
        emailOrMobile: redactIdentifier(emailOrMobile),
        nextStep: payload.nextStep ?? null,
        nextStepHref: resolvedNextStepHref,
      });

      if (resolvedNextStepHref) {
        return redirect(resolvedNextStepHref, { headers: headers.entries().next().done ? undefined : headers });
      }

      logger.info('[auth.sign-in] Returning verification payload to client', {
        emailOrMobile: redactIdentifier(emailOrMobile),
        nextStep: payload.nextStep ?? null,
      });
      return data(payload, { headers: headers.entries().next().done ? undefined : headers });
    }

    logger.warn('[auth.sign-in] Missing expected sign-in payload branch', {
      provider,
      emailOrMobile: redactIdentifier(emailOrMobile),
      nextStep: payload?.nextStep ?? null,
    });
    return redirectWithWarning(request, signInHref, 'Kunne ikke logge inn. Prøv igjen.');
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke logge inn. Prøv igjen.');
    logger.error('[auth.sign-in] Sign-in failed', {
      provider,
      emailOrMobile: redactIdentifier(emailOrMobile),
      redirectUrl: redirectUrl || null,
      status: 400,
      error,
    });
    return redirectWithError(request, signInHref, message);
  }
}

export default function AuthSignIn({ loaderData, actionData }: Route.ComponentProps) {
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
      emailDelivery:
        'emailDelivery' in actionData && actionData.emailDelivery ? String(actionData.emailDelivery.status) : null,
      mobileDelivery:
        'mobileDelivery' in actionData && actionData.mobileDelivery ? String(actionData.mobileDelivery.status) : null,
      hasVerificationToken: 'verificationToken' in actionData && Boolean(actionData.verificationToken),
    });
  }, [actionData]);

  return (
    <AuthPageTemplate
      title="Velkommen tilbake"
      description="Logg inn for å administrere ditt selskap og kundeforhold."
      error={errorMessage}
      topRight={
        <span>
          Ny bruker?{' '}
          <Link
            to={ROUTES_MAP['auth.sign-up'].href}
            className="font-semibold text-interactive hover:text-interactive-hover"
          >
            Opprett konto
          </Link>
        </span>
      }
      footer={
        <Stack space="md">
          <div className="text-center">
            <Link
              to={ROUTES_MAP['auth.forgot-password'].href}
              className="inline-block text-sm font-medium text-interactive hover:text-interactive-hover"
            >
              Tilbakestill passord
            </Link>
          </div>
        </Stack>
      }
      bottom={
        <span>
          Ved å logge inn godtar du{' '}
          <Link to="/vilkar" className="underline">
            vilkårene
          </Link>{' '}
          og har lest{' '}
          <Link to="/personvern" className="underline">
            personvernerklæringen
          </Link>
          .
        </span>
      }
    >
      <Form method="post" aria-busy={isSubmitting}>
        <input type="hidden" name="returnTo" value={loaderData.returnTo ?? ''} />
        <Stack space="md">
          <FormField
            id="emailOrMobile"
            name="emailOrMobile"
            label="E-post eller mobilnummer"
            type="text"
            autoComplete="username"
            placeholder="deg@firma.no eller 40 00 00 00"
            startIcon={<User />}
            disabled={isSubmitting}
          />

          <FormField
            id="password"
            name="password"
            label="Passord"
            type="password"
            autoComplete="current-password"
            startIcon={<Lock />}
            disabled={isSubmitting}
          />

          <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
            Logg inn
          </Button>

          <SocialButtonRow disabled={isSubmitting} />
        </Stack>
      </Form>
    </AuthPageTemplate>
  );
}
