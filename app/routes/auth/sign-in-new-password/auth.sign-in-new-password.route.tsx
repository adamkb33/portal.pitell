import { useState } from 'react';
import { Form, data, redirect, useNavigation } from 'react-router';
import { Lock } from 'lucide-react';
import { AuthController } from '~/api/generated';
import { resolveErrorPayload } from '~/lib/api-error';
import { redirectWithError } from '~/lib/flash-message.server';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { AuthPageTemplate, FormField, Stack } from '~/ui';
import { AuthSubmitBar } from '../_components/auth-submit-bar';
import { finishSignIn } from '../_utils/finish-sign-in.server';
import { clearSignInFlow, readSignInFlow } from '../_utils/sign-in-flow.cookie.server';
import type { Route } from './+types/auth.sign-in-new-password.route';
import { withoutLogin } from '~/lib/auth-middleware.server';

const MIN_PASSWORD_LENGTH = 8;

export async function loader({ request }: Route.LoaderArgs) {
  const flow = await readSignInFlow(request);
  if (!flow?.resetPasswordToken) return redirect(ROUTES_MAP['auth.sign-in'].href);
  return { identifier: flow.identifier };
}

export async function action({ request }: Route.ActionArgs) {
  const flow = await readSignInFlow(request);
  if (!flow?.resetPasswordToken) return redirect(ROUTES_MAP['auth.sign-in'].href);
  const password = String((await request.formData()).get('password') ?? '');
  if (password.length < MIN_PASSWORD_LENGTH) {
    return data({ error: `Passordet må ha minst ${MIN_PASSWORD_LENGTH} tegn.` }, { status: 400 });
  }

  const resetPasswordToken = flow.resetPasswordToken;
  try {
    const tokens = (
      await withoutLogin(() =>
        AuthController.resetPassword({
          body: { resetPasswordToken, password, password2: password },
        }),
      )
    ).data?.data;
    if (!tokens) throw new Error('Missing tokens after setting password');
    const { href, headers } = await finishSignIn(tokens, flow.returnTo);
    headers.append('Set-Cookie', await clearSignInFlow());
    return redirect(href, { headers });
  } catch (error) {
    const { code, message } = resolveErrorPayload(error, 'Kunne ikke lagre passordet. Prøv igjen.');
    if (code === 'RESET_PASSWORD_TOKEN_INVALID') {
      return redirectWithError(request, ROUTES_MAP['auth.sign-in'].href, 'Tiden gikk ut. Start på nytt.');
    }
    return data({ error: message }, { status: 400 });
  }
}

/** Last step after a code: choose a password, then straight in. */
export default function AuthSignInNewPassword({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== 'idle';
  const [password, setPassword] = useState('');

  return (
    <AuthPageTemplate title="Velg passord" error={actionData?.error}>
      <Form method="post" aria-busy={isSubmitting}>
        {/* Lets password managers save the new password under the right account. */}
        <input type="hidden" name="username" value={loaderData.identifier} autoComplete="username" />
        <Stack space="md">
          <FormField
            id="password"
            name="password"
            label="Nytt passord"
            type="password"
            autoComplete="new-password"
            startIcon={<Lock />}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoFocus
            disabled={isSubmitting}
          />
          <AuthSubmitBar
            label="Lagre og logg inn"
            loadingLabel="Lagrer ..."
            missing={password.length >= MIN_PASSWORD_LENGTH ? null : `Minst ${MIN_PASSWORD_LENGTH} tegn`}
            loading={isSubmitting}
          />
        </Stack>
      </Form>
    </AuthPageTemplate>
  );
}
