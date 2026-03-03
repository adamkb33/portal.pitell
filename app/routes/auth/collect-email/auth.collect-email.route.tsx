import { Link, Form, data, redirect, useNavigation } from 'react-router';
import type { Route } from './+types/auth.collect-email.route';

import { AuthController } from '~/api/generated/base';
import { resolveErrorPayload } from '~/lib/api-error';
import { ROUTES_MAP } from '~/lib/route-tree';
import { AuthFormButton } from '../_components/auth.form-button';
import { AuthFormContainer } from '../_components/auth.form-container';
import { AuthFormField } from '../_components/auth.form-field';
import { resolveAuthPostRedirect } from '../_utils/auth-flow.server';

type LoaderData = {
  userId: number;
};

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const userId = Number(url.searchParams.get('userId') || '');

  if (!userId || Number.isNaN(userId)) {
    return redirect(ROUTES_MAP['auth.sign-in'].href);
  }

  return data({ userId } satisfies LoaderData);
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const userId = Number(formData.get('userId') || '');
  const email = String(formData.get('email') || '').trim();

  if (!userId || Number.isNaN(userId)) {
    return data({ error: 'Mangler bruker-ID. Prøv igjen.' }, { status: 400 });
  }

  try {
    const response = await AuthController.providerCompleteProfile({
      body: {
        userId,
        email,
      },
    });

    const payload = response.data?.data ?? null;
    const { nextStepHref, verificationCookieHeader } = await resolveAuthPostRedirect(payload);
    const headers = new Headers();

    if (verificationCookieHeader) {
      headers.append('Set-Cookie', verificationCookieHeader);
    }

    return redirect(nextStepHref ?? ROUTES_MAP['auth.sign-in'].href, {
      headers: headers.has('Set-Cookie') ? headers : undefined,
    });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke lagre e-post. Prøv igjen.');
    return data({ error: message }, { status: status ?? 400 });
  }
}

export default function AuthCollectEmail({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const errorMessage =
    actionData && typeof actionData === 'object' && 'error' in actionData ? String(actionData.error) : undefined;

  return (
    <AuthFormContainer
      title="Legg til e-post"
      description="Vi trenger e-postadressen din for å fullføre registreringen."
      error={errorMessage}
      secondaryAction={
        <div className="space-y-2 text-center">
          <Link
            to={ROUTES_MAP['auth.sign-in'].href}
            className="inline-block text-sm font-medium text-foreground hover:underline"
          >
            Gå til innlogging →
          </Link>
        </div>
      }
    >
      <Form method="post" className="space-y-4" aria-busy={isSubmitting}>
        <input type="hidden" name="userId" value={loaderData.userId} />
        <AuthFormField
          id="email"
          name="email"
          label="E-post"
          type="email"
          autoComplete="email"
          placeholder="E-post"
          required
          disabled={isSubmitting}
        />

        <AuthFormButton isLoading={isSubmitting} loadingText="Lagrer…">
          Fortsett
        </AuthFormButton>
      </Form>
    </AuthFormContainer>
  );
}
