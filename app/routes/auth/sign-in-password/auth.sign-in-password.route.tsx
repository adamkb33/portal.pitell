import { useState } from 'react';
import { Form, Link, redirect, useNavigation } from 'react-router';
import { Lock, Mail, Phone } from 'lucide-react';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { AuthPageTemplate, FormField, Stack } from '~/ui';
import { AuthSubmitBar } from '../_components/auth-submit-bar';
import { readSignInFlow } from '../_utils/sign-in-flow.cookie.server';
import { sendCodeAndContinue } from '../_utils/send-sign-in-code.server';
import type { Route } from './+types/auth.sign-in-password.route';

export async function loader({ request }: Route.LoaderArgs) {
  const flow = await readSignInFlow(request);
  if (!flow) return redirect(ROUTES_MAP['auth.sign-in'].href);
  return { identifier: flow.identifier, returnTo: flow.returnTo };
}

/** "Glemt passord?": send a code to the same number or email, then choose a new password. */
export async function action({ request }: Route.ActionArgs) {
  const flow = await readSignInFlow(request);
  if (!flow) return redirect(ROUTES_MAP['auth.sign-in'].href);
  return sendCodeAndContinue(request, flow.identifier, flow.returnTo);
}

/** Step two for accounts with a password. The password goes to the sign-in action, which signs them in. */
export default function AuthSignInPassword({ loaderData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const signInHref = ROUTES_MAP['auth.sign-in'].href;
  const isSigningIn = navigation.state === 'submitting' && navigation.formAction === signInHref;
  const isSendingCode = navigation.state === 'submitting' && !isSigningIn;
  const isBusy = navigation.state !== 'idle';
  const [password, setPassword] = useState('');
  const isEmail = loaderData.identifier.includes('@');

  return (
    <AuthPageTemplate title="Skriv inn passord">
      <Stack space="md">
        <div className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-border px-3 py-2.5 text-sm">
          <span className="flex min-w-0 items-center gap-2 text-text-primary">
            {isEmail ? (
              <Mail className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />
            ) : (
              <Phone className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />
            )}
            <span className="truncate">{loaderData.identifier}</span>
          </span>
          <Link
            to={signInHref}
            className="inline-flex min-h-11 items-center font-semibold text-interactive hover:text-interactive-hover"
          >
            Endre
          </Link>
        </div>

        <Form method="post" action={signInHref} aria-busy={isSigningIn}>
          <input type="hidden" name="emailOrMobile" value={loaderData.identifier} autoComplete="username" />
          <input type="hidden" name="returnTo" value={loaderData.returnTo ?? ''} />
          <input type="hidden" name="retryTo" value={ROUTES_MAP['auth.sign-in-password'].href} />
          <Stack space="md">
            <FormField
              id="password"
              name="password"
              label="Passord"
              type="password"
              autoComplete="current-password"
              startIcon={<Lock />}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
              disabled={isBusy}
            />
            <AuthSubmitBar
              label="Logg inn"
              loadingLabel="Logger inn ..."
              missing={password ? null : 'Skriv inn passordet'}
              loading={isSigningIn}
              disabled={isBusy}
            />
          </Stack>
        </Form>

        <Form method="post">
          <button
            type="submit"
            disabled={isBusy}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-interactive hover:text-interactive-hover disabled:opacity-60"
          >
            {isSendingCode ? 'Sender kode ...' : 'Glemt passord?'}
          </button>
        </Form>
      </Stack>
    </AuthPageTemplate>
  );
}
