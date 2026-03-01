// auth.reset-password.route.tsx (refactored)
import { Form, Link, redirect, data, useNavigation } from 'react-router';
import type { Route } from './+types/auth.reset-password.route';

import { decodeResetPasswordToken } from './_utils/auth.reset-password.utils';
import { AuthFormContainer } from '../_components/auth.form-container';
import { AuthFormField } from '../_components/auth.form-field';
import { AuthFormButton } from '../_components/auth.form-button';
import { AuthController } from '~/api/generated/base';
import { authService } from '~/lib/auth-service';
import { resolveErrorPayload } from '~/lib/api-error';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const resetPasswordToken = url.searchParams.get('token');

  if (!resetPasswordToken) {
    throw redirect('/');
  }

  const decodedToken = decodeResetPasswordToken(resetPasswordToken);
  if (!decodedToken || !decodedToken.email) {
    throw redirect('/');
  }

  return { resetPasswordToken, email: decodedToken.email };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const resetPasswordToken = String(formData.get('resetPasswordToken'));
  const password = String(formData.get('password'));
  const confirmPassword = String(formData.get('confirmPassword'));

  try {
    const response = await AuthController.resetPassword({
      body: {
        resetPasswordToken,
        password,
        password2: confirmPassword,
      },
    });

    if (!response.data || !response.data.data) {
      const message = response.data?.message || 'Noe gikk galt. Prøv igjen.';
      return data(
        {
          error: message,
        },
        { status: 400 },
      );
    }

    const { headers } = await authService.processTokenRefresh({
      accessToken: response.data.data.accessToken,
      refreshToken: response.data.data.refreshToken,
      accessTokenExpiresAt: response.data.data.accessTokenExpiresAt,
      refreshTokenExpiresAt: response.data.data.refreshTokenExpiresAt,
    });

    return redirect('/', { headers });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Noe gikk galt. Prøv igjen.');
    return data(
      {
        error: message,
      },
      { status: status ?? 400 },
    );
  }
}

export default function AuthResetPassword({ loaderData, actionData }: Route.ComponentProps) {
  const { resetPasswordToken, email } = loaderData;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const errorMessage = actionData?.error;
  return (
    <AuthFormContainer
      title="Tilbakestill passord"
      description="Opprett et nytt passord for din konto."
      error={errorMessage}
      secondaryAction={
        <Link to="/" className="mt-2 block text-center text-sm font-medium text-foreground hover:underline">
          Tilbake til forsiden →
        </Link>
      }
    >
      <Form method="post" className="space-y-6">
        <input type="hidden" name="resetPasswordToken" value={resetPasswordToken} />

        <AuthFormField
          id="email"
          name="email"
          label="E-post"
          type="email"
          autoComplete="email"
          defaultValue={email}
          disabled
        />

        <AuthFormField
          id="password"
          name="password"
          label="Passord"
          type="password"
          autoComplete="new-password"
          required
          disabled={isSubmitting}
        />

        <AuthFormField
          id="confirmPassword"
          name="confirmPassword"
          label="Bekreft passord"
          type="password"
          autoComplete="new-password"
          required
          disabled={isSubmitting}
        />

        <AuthFormButton isLoading={isSubmitting} loadingText="Tilbakestiller…">
          Tilbakestill passord
        </AuthFormButton>
      </Form>
    </AuthFormContainer>
  );
}
