// auth.sign-in.route.tsx
import { Link, Form, useNavigation, redirect } from 'react-router';
import { data } from 'react-router';
import { useState } from 'react';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { SocialButtonRow } from '../_components/social-button-row';
import { AuthController } from '~/api/generated';
import { resolveErrorPayload } from '~/lib/api-error';
import type { Route } from './+types/auth.sign-in.route';
import { authService } from '~/lib/auth-service';
import { redirectWithError, redirectWithWarning } from '~/lib/flash-message.server';
import { logger } from '~/lib/logger';
import { resolveAuthPostRedirect } from '../_utils/auth-flow.server';
import { FormField, AuthPageTemplate, Stack } from '~/ui';
import { User } from 'lucide-react';
import { getSafeReturnTo } from '~/utils';
import { AuthSubmitBar } from '../_components/auth-submit-bar';
import { finishSignIn } from '../_utils/finish-sign-in.server';
import { clearSignInFlow, readSignInFlow, writeSignInFlow } from '../_utils/sign-in-flow.cookie.server';
import { sendCodeAndContinue } from '../_utils/send-sign-in-code.server';
import { withoutLogin } from '~/lib/auth-middleware.server';

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

function buildSignInHref(returnTo?: string | null) {
  const href = ROUTES_MAP['auth.sign-in'].href;
  return returnTo ? `${href}?${new URLSearchParams({ returnTo })}` : href;
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const flow = await readSignInFlow(request);
  // "Endre" on a later step comes back here with the number or email still filled in.
  return {
    returnTo: getSafeReturnTo(url.searchParams.get('returnTo')) ?? flow?.returnTo ?? null,
    identifier: flow?.identifier ?? '',
  };
}

/**
 * Step one: only the mobile number or email. An account with a password goes on to the password step, an account
 * without one (a guest from a booking) gets a code, and someone unknown goes to sign-up with the field filled in.
 */
async function lookupAction(request: Request, emailOrMobile: string, returnTo: string | null) {
  const identifier = emailOrMobile.trim();
  const signInHref = ROUTES_MAP['auth.sign-in'].href;
  if (!identifier) return redirectWithError(request, signInHref, 'Skriv inn mobilnummer eller e-post.');

  try {
    const method = (await withoutLogin(() => AuthController.signInLookup({ body: { emailOrMobile: identifier } }))).data
      ?.data?.method;

    if (method === 'PASSWORD') {
      return redirect(ROUTES_MAP['auth.sign-in-password'].href, {
        headers: { 'Set-Cookie': await writeSignInFlow({ identifier, returnTo }) },
      });
    }

    if (method === 'SIGN_UP') {
      return redirect(ROUTES_MAP['auth.sign-up'].href, {
        headers: { 'Set-Cookie': await writeSignInFlow({ identifier, returnTo }) },
      });
    }

    return await sendCodeAndContinue(request, identifier, returnTo);
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke logge inn. Prøv igjen.');
    return redirectWithError(request, signInHref, message);
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const provider = String(formData.get('provider') || 'LOCAL');
  const idToken = String(formData.get('idToken') || '');
  const emailOrMobile = String(formData.get('emailOrMobile') || '');
  const password = String(formData.get('password') || '');
  const returnTo = getSafeReturnTo(String(formData.get('returnTo') || ''));
  // The password step posts here; a wrong password sends them back to that step (retryTo).
  const signInHref = getSafeReturnTo(String(formData.get('retryTo') || '')) ?? buildSignInHref(returnTo);
  const isGoogleLogin = provider === 'GOOGLE';

  if (!isGoogleLogin && !formData.has('password')) {
    return lookupAction(request, emailOrMobile, returnTo);
  }

  if (isGoogleLogin && !idToken) {
    logger.warn('[auth.sign-in] Missing Google idToken');
    return redirectWithError(request, signInHref, 'Kunne ikke logge inn med Google. Prøv igjen.');
  }

  try {
    const response = await withoutLogin(() =>
      AuthController.signIn({
        body: isGoogleLogin ? { provider: 'GOOGLE', idToken } : { provider: 'LOCAL', emailOrMobile, password },
      }),
    );
    const payload = response.data?.data;

    // One line per sign-in: who (masked), how, and what comes next (DONE or a verification step and its code delivery).
    logger.info(`[auth.sign-in] ${provider} → ${payload?.nextStep ?? 'no next step'}`, {
      emailOrMobile: redactIdentifier(emailOrMobile),
      emailDelivery: payload?.emailDelivery?.status,
      mobileDelivery: payload?.mobileDelivery?.status,
    });

    if (payload?.nextStep === 'DONE' && payload.authTokens) {
      const { href, headers } = await finishSignIn(payload.authTokens, returnTo);
      headers.append('Set-Cookie', await clearSignInFlow());
      return redirect(href, { headers });
    }

    if (payload?.nextStep) {
      const { nextStepHref, verificationCookieHeader } = await resolveAuthPostRedirect(payload);
      const headers = new Headers();
      const resolvedNextStepHref = nextStepHref;

      if (payload.authTokens) {
        const authCookieHeaders = await authService.setAuthCookies(
          payload.authTokens.accessToken,
          payload.authTokens.refreshToken,
          payload.authTokens.accessTokenExpiresAt,
          payload.authTokens.refreshTokenExpiresAt,
        );
        for (const [key, value] of new Headers(authCookieHeaders).entries()) {
          headers.append(key, value);
        }
      }

      if (verificationCookieHeader) {
        headers.append('Set-Cookie', verificationCookieHeader);
      }

      if (resolvedNextStepHref) {
        return redirect(resolvedNextStepHref, { headers: headers.entries().next().done ? undefined : headers });
      }

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
      status: 400,
      error,
    });
    return redirectWithError(request, signInHref, message);
  }
}

export default function AuthSignIn({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const [identifier, setIdentifier] = useState(loaderData.identifier);
  const errorMessage =
    actionData && typeof actionData === 'object' && 'error' in actionData ? String(actionData.error) : undefined;

  return (
    <AuthPageTemplate title="Logg inn" error={errorMessage} bottom={<TermsLine />}>
      <Form method="post" aria-busy={isSubmitting}>
        <input type="hidden" name="returnTo" value={loaderData.returnTo ?? ''} />
        <Stack space="md">
          <FormField
            id="emailOrMobile"
            name="emailOrMobile"
            label="Mobilnummer eller e-post"
            type="text"
            autoComplete="username"
            startIcon={<User />}
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            autoFocus
            disabled={isSubmitting}
          />

          <AuthSubmitBar
            label="Fortsett"
            missing={identifier.trim() ? null : 'Skriv inn mobilnummer eller e-post'}
            loading={isSubmitting}
          />

          <SocialButtonRow disabled={isSubmitting} />
        </Stack>
      </Form>
    </AuthPageTemplate>
  );
}

function TermsLine() {
  return (
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
  );
}
