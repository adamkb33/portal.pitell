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

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const provider = String(formData.get('provider') || 'LOCAL');
  const idToken = String(formData.get('idToken') || '');
  const email = String(formData.get('email') || '');
  const password = String(formData.get('password') || '');
  const redirectUrl = String(formData.get('redirectUrl') || '');
  const isGoogleLogin = provider === 'GOOGLE';

  if (isGoogleLogin && !idToken) {
    return data({ error: 'Kunne ikke logge inn med Google. Prøv igjen.' }, { status: 400 });
  }

  try {
    const response = await AuthController.signIn({
      query: {
        redirectUrl: redirectUrl || undefined,
      },
      body: isGoogleLogin ? { provider: 'GOOGLE', idToken } : { provider: 'LOCAL', emailOrMobile: email, password },
    });

    if (response.data?.data?.verificationTokenDto) {
      const cookie = await verificationSessionToken.serialize(response.data?.data?.verificationTokenDto.value, {
        expires: new Date(response.data?.data?.verificationTokenDto.expiresAt),
      });
      const headers = new Headers();
      headers.append('Set-Cookie', cookie);
      return data(response.data?.data, { headers });
    }

    if (response.data?.data?.authTokens) {
      const headers = await authService.setAuthCookies(
        response.data?.data?.authTokens.accessToken,
        response.data?.data?.authTokens.refreshToken,
        response.data?.data?.authTokens.accessTokenExpiresAt,
        response.data?.data?.authTokens.refreshTokenExpiresAt,
      );
      return redirect('/', { headers });
    }

    return redirectWithWarning(request, ROUTES_MAP['auth.sign-in'].href, 'Kunne ikke logge inn. Prøv igjen.');
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke logge inn. Prøv igjen.');
    return data({ error: message }, { status: status ?? 400 });
  }
}

export default function AuthSignIn({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const errorMessage =
    actionData && typeof actionData === 'object' && 'error' in actionData ? String(actionData.error) : undefined;

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
